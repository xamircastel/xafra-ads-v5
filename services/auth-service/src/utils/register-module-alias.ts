import { readFileSync } from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { register } from 'tsconfig-paths';

type CompilerOptions = {
  baseUrl?: string;
  paths?: Record<string, string[]>;
};

const tsconfigPath = path.resolve(__dirname, '../../../../tsconfig.json');
const tsconfigContent = readFileSync(tsconfigPath, 'utf-8');
const rootTsConfig = JSON.parse(tsconfigContent) as { compilerOptions?: CompilerOptions };

const compilerOptions: CompilerOptions = rootTsConfig?.compilerOptions ?? {};
const configuredBaseUrl = compilerOptions.baseUrl ?? '.';

const baseUrl = path.resolve(__dirname, '../../../../', configuredBaseUrl);
const paths = compilerOptions.paths ?? {};

const hasPaths = Object.keys(paths).length > 0;

if (hasPaths) {
  register({
    baseUrl,
    paths,
    addMatchAll: true
  });
} else {
  const tsconfigUrl = pathToFileURL(tsconfigPath).href;
  console.warn('[register-module-alias] No path mappings found in', tsconfigUrl);
}