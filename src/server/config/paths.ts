import path from 'path';
import { fileURLToPath } from 'url';

const currentFilePath = fileURLToPath(import.meta.url);
const configDirectory = path.dirname(currentFilePath);
const projectRoot = path.resolve(configDirectory, '../../..');
const staticDirectory = path.join(projectRoot, 'static');
const distDirectory = path.join(projectRoot, 'dist');

export function projectRootPath(): string {
  return projectRoot;
}

export function staticDirectoryPath(): string {
  return staticDirectory;
}

export function distDirectoryPath(): string {
  return distDirectory;
}

export default {
  projectRootPath,
  staticDirectoryPath,
  distDirectoryPath,
};
