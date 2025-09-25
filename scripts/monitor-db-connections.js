/**
 * Database Connection Monitor
 * Monitorea las IPs que se conectan a PostgreSQL para recopilar datos
 * sobre los rangos de IP que usa Cloud Run dinámicamente
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

class DatabaseConnectionMonitor {
  constructor() {
    this.logFile = path.join(__dirname, '..', 'logs', 'db-connections.jsonl');
    this.summaryFile = path.join(__dirname, '..', 'logs', 'ip-analysis.json');
    this.ensureLogDirectory();
  }

  ensureLogDirectory() {
    const logDir = path.dirname(this.logFile);
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
  }

  /**
   * Ejecuta query en PostgreSQL para obtener conexiones activas
   */
  async getActiveConnections() {
    try {
      // Query para obtener conexiones activas con IPs de origen
      const query = `
        SELECT 
          NOW() as timestamp,
          client_addr as ip_address,
          client_hostname,
          client_port,
          application_name,
          state,
          query_start,
          datname as database_name,
          usename as username
        FROM pg_stat_activity 
        WHERE client_addr IS NOT NULL 
        AND client_addr != '127.0.0.1'
        AND client_addr != '::1'
        ORDER BY query_start DESC;
      `;

      const result = execSync(`gcloud sql connect xafra-ads-postgres --user=postgres --quiet << 'EOF'
\\copy (${query.replace(/\n/g, ' ')}) TO STDOUT WITH CSV HEADER;
\\q
EOF`, { encoding: 'utf8' });

      return this.parseCSVResult(result);
    } catch (error) {
      console.error('Error obteniendo conexiones:', error.message);
      return [];
    }
  }

  /**
   * Parsea resultado CSV de PostgreSQL
   */
  parseCSVResult(csvData) {
    const lines = csvData.trim().split('\n');
    if (lines.length <= 1) return [];

    const headers = lines[0].split(',');
    return lines.slice(1).map(line => {
      const values = line.split(',');
      const entry = {};
      headers.forEach((header, index) => {
        entry[header.trim()] = values[index]?.trim() || '';
      });
      return entry;
    });
  }

  /**
   * Registra conexión en archivo de log
   */
  logConnection(connectionData) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      connections: connectionData,
      cloudRunIPs: connectionData
        .filter(conn => this.isCloudRunIP(conn.ip_address))
        .map(conn => conn.ip_address),
      totalConnections: connectionData.length
    };

    // Append al archivo JSONL (JSON Lines)
    fs.appendFileSync(this.logFile, JSON.stringify(logEntry) + '\n');
    
    console.log(`[${logEntry.timestamp}] Registradas ${logEntry.totalConnections} conexiones, ${logEntry.cloudRunIPs.length} de Cloud Run`);
    
    if (logEntry.cloudRunIPs.length > 0) {
      console.log('IPs Cloud Run detectadas:', logEntry.cloudRunIPs);
    }
  }

  /**
   * Determina si una IP es probablemente de Cloud Run
   * Basado en rangos conocidos de Google Cloud
   */
  isCloudRunIP(ip) {
    if (!ip || ip === '') return false;

    // Rangos conocidos de Google Cloud (us-central1)
    const googleCloudRanges = [
      /^34\./,          // 34.*.*.* 
      /^35\./,          // 35.*.*.*
      /^104\.154\./,    // 104.154.*.*
      /^104\.196\./,    // 104.196.*.*
      /^130\.211\./,    // 130.211.*.*
      /^146\.148\./,    // 146.148.*.*
      /^199\.36\.153\./, // 199.36.153.*
      /^199\.192\.112\./ // 199.192.112.*
    ];

    // Excluir IPs conocidas (tu IP local, etc.)
    const excludePatterns = [
      /^192\.168\./,    // Redes privadas
      /^10\./,          // Redes privadas
      /^172\.(1[6-9]|2[0-9]|3[0-1])\./ // Redes privadas
    ];

    // Si coincide con patrón de exclusión, no es Cloud Run
    if (excludePatterns.some(pattern => pattern.test(ip))) {
      return false;
    }

    // Si coincide con rangos de Google Cloud, probablemente es Cloud Run
    return googleCloudRanges.some(pattern => pattern.test(ip));
  }

  /**
   * Genera análisis de patrones IP basado en logs históricos
   */
  analyzeIPPatterns() {
    if (!fs.existsSync(this.logFile)) {
      console.log('No hay datos de conexiones para analizar');
      return;
    }

    const logs = fs.readFileSync(this.logFile, 'utf8')
      .split('\n')
      .filter(line => line.trim())
      .map(line => JSON.parse(line));

    const analysis = {
      generatedAt: new Date().toISOString(),
      totalSamples: logs.length,
      dateRange: {
        start: logs[0]?.timestamp,
        end: logs[logs.length - 1]?.timestamp
      },
      uniqueIPs: new Set(),
      ipFrequency: {},
      cloudRunIPs: new Set(),
      patterns: {}
    };

    // Procesar logs
    logs.forEach(log => {
      log.cloudRunIPs?.forEach(ip => {
        analysis.uniqueIPs.add(ip);
        analysis.cloudRunIPs.add(ip);
        analysis.ipFrequency[ip] = (analysis.ipFrequency[ip] || 0) + 1;
      });
    });

    // Convertir Sets a Arrays para JSON
    analysis.uniqueIPs = Array.from(analysis.uniqueIPs);
    analysis.cloudRunIPs = Array.from(analysis.cloudRunIPs);

    // Análisis de patrones
    analysis.patterns = this.identifyIPPatterns(analysis.cloudRunIPs);

    // Guardar análisis
    fs.writeFileSync(this.summaryFile, JSON.stringify(analysis, null, 2));

    console.log('\n=== ANÁLISIS DE PATRONES IP ===');
    console.log(`Total muestras: ${analysis.totalSamples}`);
    console.log(`IPs únicas de Cloud Run: ${analysis.cloudRunIPs.length}`);
    console.log(`Rango de fechas: ${analysis.dateRange.start} - ${analysis.dateRange.end}`);
    console.log('\nPatrones identificados:');
    Object.entries(analysis.patterns).forEach(([pattern, ips]) => {
      console.log(`  ${pattern}: ${ips.length} IPs`);
    });

    return analysis;
  }

  /**
   * Identifica patrones en las IPs para sugerir rangos de whitelist
   */
  identifyIPPatterns(ips) {
    const patterns = {};

    ips.forEach(ip => {
      // Agrupa por los primeros dos octetos (ej: 34.28.*.*)
      const parts = ip.split('.');
      if (parts.length === 4) {
        const pattern = `${parts[0]}.${parts[1]}.*.*`;
        if (!patterns[pattern]) patterns[pattern] = [];
        patterns[pattern].push(ip);
      }
    });

    return patterns;
  }

  /**
   * Ejecuta monitoreo continuo
   */
  async startMonitoring(intervalMinutes = 5) {
    console.log(`Iniciando monitoreo de conexiones cada ${intervalMinutes} minutos...`);
    console.log(`Logs: ${this.logFile}`);
    console.log(`Análisis: ${this.summaryFile}`);

    const monitor = async () => {
      try {
        const connections = await this.getActiveConnections();
        this.logConnection(connections);
        
        // Cada 12 horas, generar análisis
        const now = new Date();
        if (now.getHours() === 0 || now.getHours() === 12) {
          if (now.getMinutes() < intervalMinutes) {
            this.analyzeIPPatterns();
          }
        }
      } catch (error) {
        console.error('Error en monitoreo:', error.message);
      }
    };

    // Ejecutar inmediatamente
    await monitor();

    // Programar ejecución periódica
    setInterval(monitor, intervalMinutes * 60 * 1000);
  }
}

// CLI
if (require.main === module) {
  const monitor = new DatabaseConnectionMonitor();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'start':
      const interval = parseInt(process.argv[3]) || 5;
      monitor.startMonitoring(interval);
      break;
      
    case 'analyze':
      monitor.analyzeIPPatterns();
      break;
      
    case 'once':
      monitor.getActiveConnections().then(connections => {
        monitor.logConnection(connections);
        console.log('Monitoreo ejecutado una vez');
      });
      break;
      
    default:
      console.log(`
Uso: node monitor-db-connections.js <comando>

Comandos:
  start [minutos]  - Inicia monitoreo continuo (default: 5 min)
  analyze         - Analiza patrones en logs existentes  
  once           - Ejecuta monitoreo una sola vez

Ejemplos:
  node monitor-db-connections.js start 10  # Cada 10 minutos
  node monitor-db-connections.js analyze   # Solo análisis
  node monitor-db-connections.js once      # Una ejecución
      `);
  }
}

module.exports = DatabaseConnectionMonitor;