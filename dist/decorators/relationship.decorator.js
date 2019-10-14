"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
function Relationship(options) {
    if (options === void 0) { options = { resource: '' }; }
    return function (target, propertyName) {
        var annotations = Reflect.getMetadata('Relationship', target) || [];
        annotations.push({
            propertyName: propertyName,
            relationship: options.resource || propertyName
        });
        Reflect.defineMetadata('Relationship', annotations, target);
    };
}
exports.Relationship = Relationship;
//# sourceMappingURL=relationship.decorator.js.map