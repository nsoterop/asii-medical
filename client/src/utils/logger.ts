const info = (message: string) => {
  console.log(`INFO: ${message}`);
}
const error = (message: string) => {
  console.error(`ERROR: ${message}`, error);
}
const warn = (message: string) => { 
  console.warn(`WARNING: ${message}`);
}
const debug = (message: string) => {    
  console.debug(`DEBUG: ${message}`);
}

const logger = {
  info,
  error,
  warn,
  debug,
}
export default logger;