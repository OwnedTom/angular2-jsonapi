"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var symbols_1 = require("../constants/symbols");
var date_converter_1 = require("../converters/date/date.converter");
var _ = require("lodash");
function Attribute(options) {
    if (options === void 0) { options = {}; }
    return function (target, propertyName) {
        var converter = function (dataType, value, forSerialisation) {
            if (forSerialisation === void 0) { forSerialisation = false; }
            var attrConverter;
            if (options.converter) {
                attrConverter = options.converter;
            }
            else if (dataType === Date) {
                attrConverter = new date_converter_1.DateConverter();
            }
            else {
                var datatype = new dataType();
                if (datatype.mask && datatype.unmask) {
                    attrConverter = datatype;
                }
            }
            if (attrConverter) {
                if (!forSerialisation) {
                    return attrConverter.mask(value);
                }
                return attrConverter.unmask(value);
            }
            return value;
        };
        var saveAnnotations = function () {
            var metadata = Reflect.getMetadata('Attribute', target) || {};
            metadata[propertyName] = {
                marked: true
            };
            Reflect.defineMetadata('Attribute', metadata, target);
            var mappingMetadata = Reflect.getMetadata('AttributeMapping', target) || {};
            var serializedPropertyName = options.serializedName !== undefined ? options.serializedName : propertyName;
            mappingMetadata[serializedPropertyName] = propertyName;
            Reflect.defineMetadata('AttributeMapping', mappingMetadata, target);
        };
        var setMetadata = function (instance, oldValue, newValue) {
            var targetType = Reflect.getMetadata('design:type', target, propertyName);
            if (!instance[symbols_1.AttributeMetadata]) {
                instance[symbols_1.AttributeMetadata] = {};
            }
            instance[symbols_1.AttributeMetadata][propertyName] = {
                newValue: newValue,
                oldValue: oldValue,
                nested: false,
                serializedName: options.serializedName,
                hasDirtyAttributes: !_.isEqual(oldValue, newValue),
                serialisationValue: converter(targetType, newValue, true)
            };
        };
        var getter = function () {
            return this["_" + propertyName];
        };
        var setter = function (newVal) {
            var targetType = Reflect.getMetadata('design:type', target, propertyName);
            var convertedValue = converter(targetType, newVal);
            var oldValue = null;
            if (this.isModelInitialization() && this.id) {
                oldValue = converter(targetType, newVal);
            }
            else {
                if (this[symbols_1.AttributeMetadata] && this[symbols_1.AttributeMetadata][propertyName]) {
                    oldValue = this[symbols_1.AttributeMetadata][propertyName]['oldValue'];
                }
            }
            this["_" + propertyName] = convertedValue;
            setMetadata(this, oldValue, convertedValue);
        };
        if (delete target[propertyName]) {
            saveAnnotations();
            Object.defineProperty(target, propertyName, {
                get: getter,
                set: setter,
                enumerable: true,
                configurable: true
            });
        }
    };
}
exports.Attribute = Attribute;
//# sourceMappingURL=attribute.decorator.js.map