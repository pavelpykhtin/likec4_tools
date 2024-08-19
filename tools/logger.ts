import { createLogger, type LogErrorOptions, type LogOptions } from "vite";

export function createLikeC4Logger() {
    const logger = createLogger();

    return {
        ...logger,
        info(msg: string, options?: LogOptions) {
            logger.info(msg, { ...options });
        },
        error(msg: string, options?: LogOptions) {
            logger.error(msg, { ...options });
        },
        warn(msg: string, options?: LogErrorOptions) {
            logger.warn(msg, { ...options });
        }
    }
}