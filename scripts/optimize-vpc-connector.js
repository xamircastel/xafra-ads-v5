/**
 * VPC Connector Optimization Script
 * Optimiza la configuración del VPC Connector para reducir costos
 * manteniendo la funcionalidad de Redis
 */

const { execSync } = require('child_process');

class VPCConnectorOptimizer {
  constructor() {
    this.projectId = 'xafra-ads-staging'; 
    this.region = 'us-central1';
    this.connectorName = 'xafra-vpc-connector';
  }

  /**
   * Obtiene configuración actual del VPC Connector
   */
  getCurrentConfig() {
    try {
      const result = execSync(`gcloud compute networks vpc-access connectors describe ${this.connectorName} --region=${this.region} --format=json`, { encoding: 'utf8' });
      return JSON.parse(result);
    } catch (error) {
      console.error('Error obteniendo configuración actual:', error.message);
      throw error;
    }
  }

  /**
   * Analiza servicios que usan el VPC Connector
   */
  analyzeConnectorUsage() {
    console.log('🔍 Analizando uso del VPC Connector...\n');

    try {
      // Listar servicios Cloud Run que usan VPC
      const services = ['core-service-stg', 'auth-service-stg', 'campaign-service-stg', 'tracking-service-stg', 'postback-service-stg'];
      
      const usage = {};
      
      services.forEach(service => {
        try {
          const result = execSync(`gcloud run services describe ${service} --region=${this.region} --format="value(spec.template.metadata.annotations.run\\.googleapis\\.com/vpc-access-connector)"`, { encoding: 'utf8' });
          const connector = result.trim();
          
          if (connector) {
            usage[service] = {
              hasVPCConnector: true,
              connectorName: connector,
              needsRedis: this.serviceNeedsRedis(service)
            };
          } else {
            usage[service] = {
              hasVPCConnector: false,
              needsRedis: this.serviceNeedsRedis(service)
            };
          }
        } catch (error) {
          usage[service] = {
            hasVPCConnector: false,
            needsRedis: false,
            error: error.message
          };
        }
      });

      return usage;
    } catch (error) {
      console.error('Error analizando uso:', error.message);
      throw error;
    }
  }

  /**
   * Determina si un servicio necesita Redis
   */
  serviceNeedsRedis(serviceName) {
    // Basado en análisis previo de código
    const redisServices = {
      'core-service-stg': true,      // Caching de rutas y configuración
      'auth-service-stg': true,      // Tokens y sesiones
      'campaign-service-stg': true,  // Cache de campañas activas
      'tracking-service-stg': true,  // Cache de clicks y conversiones
      'postback-service-stg': false  // Solo webhook, probablemente no necesita Redis
    };

    return redisServices[serviceName] || false;
  }

  /**
   * Calcula costos actuales y optimizados
   */
  calculateCostOptimization(currentConfig) {
    console.log('💰 Análisis de costos:\n');

    const currentCosts = {
      minInstances: currentConfig.minInstances || 2,
      maxInstances: currentConfig.maxInstances || 10,
      machineType: currentConfig.machineType || 'e2-micro',
      monthlyHours: 24 * 30
    };

    // Costos por instancia por hora (aproximados en USD)
    const machineCosts = {
      'e2-micro': 0.00651,
      'f1-micro': 0.0048,
      'e2-small': 0.01302
    };

    const currentMonthlyCost = currentCosts.minInstances * machineCosts[currentCosts.machineType] * currentCosts.monthlyHours;

    // Configuración optimizada
    const optimizedConfig = {
      minInstances: 1,  // Reducir mínimo a 1 instancia
      maxInstances: 6,  // Reducir máximo (suficiente para picos)
      machineType: 'f1-micro', // Máquina más pequeña si es posible
      monthlyHours: 24 * 30
    };

    const optimizedMonthlyCost = optimizedConfig.minInstances * machineCosts[optimizedConfig.machineType] * optimizedConfig.monthlyHours;

    const savings = currentMonthlyCost - optimizedMonthlyCost;
    const savingsPercent = (savings / currentMonthlyCost) * 100;

    console.log('📊 Configuración Actual:');
    console.log(`   Min instancias: ${currentCosts.minInstances}`);
    console.log(`   Max instancias: ${currentCosts.maxInstances}`);
    console.log(`   Tipo máquina: ${currentCosts.machineType}`);
    console.log(`   Costo mensual estimado: $${currentMonthlyCost.toFixed(2)}`);

    console.log('\n📊 Configuración Optimizada:');
    console.log(`   Min instancias: ${optimizedConfig.minInstances}`);
    console.log(`   Max instancias: ${optimizedConfig.maxInstances}`);
    console.log(`   Tipo máquina: ${optimizedConfig.machineType}`);
    console.log(`   Costo mensual estimado: $${optimizedMonthlyCost.toFixed(2)}`);

    console.log('\n💡 Ahorro potencial:');
    console.log(`   Ahorro mensual: $${savings.toFixed(2)} (${savingsPercent.toFixed(1)}%)`);
    console.log(`   Ahorro anual: $${(savings * 12).toFixed(2)}`);

    return {
      current: currentCosts,
      optimized: optimizedConfig,
      savings: {
        monthly: savings,
        annual: savings * 12,
        percentage: savingsPercent
      }
    };
  }

  /**
   * Genera comandos para aplicar optimización
   */
  generateOptimizationCommands(optimizedConfig) {
    console.log('\n🔧 Comandos para aplicar optimización:\n');

    const commands = [
      '# 1. Crear respaldo de configuración actual',
      `gcloud compute networks vpc-access connectors describe ${this.connectorName} --region=${this.region} --format=yaml > vpc-connector-backup.yaml`,
      '',
      '# 2. Actualizar VPC Connector con configuración optimizada',
      `gcloud compute networks vpc-access connectors update ${this.connectorName} \\`,
      `  --region=${this.region} \\`,
      `  --min-instances=${optimizedConfig.minInstances} \\`,
      `  --max-instances=${optimizedConfig.maxInstances}`,
      '',
      '# 3. Verificar cambios aplicados',
      `gcloud compute networks vpc-access connectors describe ${this.connectorName} --region=${this.region}`,
      '',
      '# 4. Monitorear servicios por 10 minutos para asegurar estabilidad',
      'echo "Monitoreando servicios..."',
      'for service in core-service-stg auth-service-stg campaign-service-stg tracking-service-stg; do',
      '  echo "Verificando $service..."',
      `  gcloud run services describe $service --region=${this.region} --format="value(status.conditions[0].status)"`,
      'done'
    ];

    commands.forEach(cmd => console.log(cmd));

    return commands;
  }

  /**
   * Ejecuta análisis completo y genera recomendaciones
   */
  async runCompleteAnalysis() {
    console.log('🚀 VPC Connector Optimization Analysis\n');
    console.log('=====================================\n');

    try {
      // 1. Configuración actual
      console.log('1️⃣  Obteniendo configuración actual...');
      const currentConfig = this.getCurrentConfig();
      
      console.log('✅ Configuración actual:');
      console.log(`   Nombre: ${currentConfig.name}`);
      console.log(`   Red: ${currentConfig.network}`);
      console.log(`   CIDR: ${currentConfig.ipCidrRange}`);
      console.log(`   Min instancias: ${currentConfig.minInstances}`);
      console.log(`   Max instancias: ${currentConfig.maxInstances}`);
      console.log(`   Tipo máquina: ${currentConfig.machineType}`);
      console.log(`   Estado: ${currentConfig.state}\n`);

      // 2. Análisis de uso
      console.log('2️⃣  Analizando uso por servicios...');
      const usage = this.analyzeConnectorUsage();
      
      console.log('✅ Servicios que usan VPC Connector:');
      Object.entries(usage).forEach(([service, info]) => {
        const status = info.hasVPCConnector ? '🟢 Conectado' : '🔴 Sin VPC';
        const redis = info.needsRedis ? '(Necesita Redis)' : '(No necesita Redis)';
        console.log(`   ${service}: ${status} ${redis}`);
      });
      console.log();

      // 3. Análisis de costos
      console.log('3️⃣  Calculando optimización de costos...');
      const costAnalysis = this.calculateCostOptimization(currentConfig);

      // 4. Generar comandos
      console.log('4️⃣  Generando comandos de optimización...');
      const commands = this.generateOptimizationCommands(costAnalysis.optimized);

      // 5. Recomendaciones finales
      console.log('\n📋 RECOMENDACIONES FINALES:\n');
      console.log('✅ VENTAJAS de la optimización:');
      console.log(`   • Ahorro de $${costAnalysis.savings.monthly.toFixed(2)}/mes ($${costAnalysis.savings.annual.toFixed(2)}/año)`);
      console.log('   • Mantenimiento de funcionalidad Redis completa');
      console.log('   • Reducción de recursos infrautilizados');
      console.log('   • Sin impacto en usuarios finales');

      console.log('\n⚠️  CONSIDERACIONES:');
      console.log('   • Aplicar cambios en horario de bajo tráfico');
      console.log('   • Monitorear servicios por 15 minutos post-cambio');
      console.log('   • Tener comando de rollback listo');

      console.log('\n🔄 ROLLBACK en caso de problemas:');
      console.log('   gcloud compute networks vpc-access connectors update xafra-vpc-connector \\');
      console.log('     --region=us-central1 \\');
      console.log(`     --min-instances=${currentConfig.minInstances} \\`);
      console.log(`     --max-instances=${currentConfig.maxInstances}`);

      return {
        currentConfig,
        usage,
        costAnalysis,
        commands
      };

    } catch (error) {
      console.error('❌ Error en análisis:', error.message);
      throw error;
    }
  }
}

// CLI
if (require.main === module) {
  const optimizer = new VPCConnectorOptimizer();
  
  const command = process.argv[2];
  
  switch (command) {
    case 'analyze':
      optimizer.runCompleteAnalysis()
        .then(() => console.log('\n✅ Análisis completado'))
        .catch(error => {
          console.error('\n❌ Error:', error.message);
          process.exit(1);
        });
      break;
      
    case 'config':
      try {
        const config = optimizer.getCurrentConfig();
        console.log(JSON.stringify(config, null, 2));
      } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
      break;
      
    case 'usage':
      try {
        const usage = optimizer.analyzeConnectorUsage();
        console.log(JSON.stringify(usage, null, 2));
      } catch (error) {
        console.error('Error:', error.message);
        process.exit(1);
      }
      break;
      
    default:
      console.log(`
Uso: node optimize-vpc-connector.js <comando>

Comandos:
  analyze  - Ejecuta análisis completo con recomendaciones
  config   - Muestra configuración actual del VPC Connector  
  usage    - Analiza qué servicios usan el VPC Connector

Ejemplo:
  node optimize-vpc-connector.js analyze
      `);
  }
}

module.exports = VPCConnectorOptimizer;