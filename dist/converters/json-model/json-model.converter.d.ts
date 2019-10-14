import { PropertyConverter } from '../..';
import { JsonModelConverterConfig } from '../../interfaces/json-model-converter-config.interface';
export declare const DEFAULT_OPTIONS: JsonModelConverterConfig;
export declare class JsonModelConverter<T> implements PropertyConverter {
    private modelType;
    private options;
    constructor(model: T, options?: JsonModelConverterConfig);
    mask(value: any): T | Array<T>;
    unmask(value: any): any;
}
