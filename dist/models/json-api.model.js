"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var lodash_1 = require("lodash");
var symbols_1 = require("../constants/symbols");
/**
 * HACK/FIXME:
 * Type 'symbol' cannot be used as an index type.
 * TypeScript 2.9.x
 * See https://github.com/Microsoft/TypeScript/issues/24587.
 */
// tslint:disable-next-line:variable-name
var AttributeMetadataIndex = symbols_1.AttributeMetadata;
var JsonApiModel = /** @class */ (function () {
    function JsonApiModel(internalDatastore, data) {
        this.internalDatastore = internalDatastore;
        this.modelInitialization = false;
        if (data) {
            this.modelInitialization = true;
            this.id = data.id;
            Object.assign(this, data.attributes);
            this.modelInitialization = false;
        }
    }
    JsonApiModel.prototype.isModelInitialization = function () {
        return this.modelInitialization;
    };
    JsonApiModel.prototype.syncRelationships = function (data, included, remainingModels) {
        if (this.lastSyncModels === included) {
            return;
        }
        if (data) {
            var modelsForProcessing = remainingModels;
            if (modelsForProcessing === undefined) {
                modelsForProcessing = [].concat(included);
            }
            this.parseHasMany(data, included, modelsForProcessing);
            this.parseBelongsTo(data, included, modelsForProcessing);
        }
        this.lastSyncModels = included;
    };
    JsonApiModel.prototype.save = function (params, headers, customUrl) {
        this.checkChanges();
        var attributesMetadata = this[AttributeMetadataIndex];
        return this.internalDatastore.saveRecord(attributesMetadata, this, params, headers, customUrl);
    };
    Object.defineProperty(JsonApiModel.prototype, "hasDirtyAttributes", {
        get: function () {
            this.checkChanges();
            var attributesMetadata = this[AttributeMetadataIndex];
            var hasDirtyAttributes = false;
            for (var propertyName in attributesMetadata) {
                if (attributesMetadata.hasOwnProperty(propertyName)) {
                    var metadata = attributesMetadata[propertyName];
                    if (metadata.hasDirtyAttributes) {
                        hasDirtyAttributes = true;
                        break;
                    }
                }
            }
            return hasDirtyAttributes;
        },
        enumerable: true,
        configurable: true
    });
    JsonApiModel.prototype.checkChanges = function () {
        var attributesMetadata = this[symbols_1.AttributeMetadata];
        for (var propertyName in attributesMetadata) {
            if (attributesMetadata.hasOwnProperty(propertyName)) {
                var metadata = attributesMetadata[propertyName];
                if (metadata.nested) {
                    this[symbols_1.AttributeMetadata][propertyName].hasDirtyAttributes = !lodash_1.isEqual(attributesMetadata[propertyName].oldValue, attributesMetadata[propertyName].newValue);
                    this[symbols_1.AttributeMetadata][propertyName].serialisationValue = attributesMetadata[propertyName].converter(Reflect.getMetadata('design:type', this, propertyName), lodash_1.cloneDeep(attributesMetadata[propertyName].newValue), true);
                }
            }
        }
    };
    JsonApiModel.prototype.rollbackAttributes = function () {
        var attributesMetadata = this[AttributeMetadataIndex];
        for (var propertyName in attributesMetadata) {
            if (attributesMetadata.hasOwnProperty(propertyName)) {
                if (attributesMetadata[propertyName].hasDirtyAttributes) {
                    this[propertyName] = lodash_1.cloneDeep(attributesMetadata[propertyName].oldValue);
                }
            }
        }
    };
    Object.defineProperty(JsonApiModel.prototype, "modelConfig", {
        get: function () {
            return Reflect.getMetadata('JsonApiModelConfig', this.constructor);
        },
        enumerable: true,
        configurable: true
    });
    JsonApiModel.prototype.parseHasMany = function (data, included, remainingModels) {
        var hasMany = Reflect.getMetadata('HasMany', this);
        if (hasMany) {
            for (var _i = 0, hasMany_1 = hasMany; _i < hasMany_1.length; _i++) {
                var metadata = hasMany_1[_i];
                var relationship = data.relationships ? data.relationships[metadata.relationship] : null;
                if (relationship && relationship.data && Array.isArray(relationship.data)) {
                    var allModels = [];
                    var modelTypesFetched = [];
                    for (var _a = 0, _b = Object.keys(relationship.data); _a < _b.length; _a++) {
                        var typeIndex = _b[_a];
                        var typeName = relationship.data[typeIndex].type;
                        if (!lodash_1.includes(modelTypesFetched, typeName)) {
                            modelTypesFetched.push(typeName);
                            // tslint:disable-next-line:max-line-length
                            var modelType = Reflect.getMetadata('JsonApiDatastoreConfig', this.internalDatastore.constructor).models[typeName];
                            if (modelType) {
                                var relationshipModels = this.getHasManyRelationship(modelType, relationship.data, included, typeName, remainingModels);
                                if (relationshipModels.length > 0) {
                                    allModels = allModels.concat(relationshipModels);
                                }
                            }
                            else {
                                throw { message: "parseHasMany - Model type for relationship " + typeName + " not found." };
                            }
                        }
                    }
                    this[metadata.propertyName] = allModels;
                }
            }
        }
    };
    JsonApiModel.prototype.parseBelongsTo = function (data, included, remainingModels) {
        var belongsTo = Reflect.getMetadata('BelongsTo', this);
        if (belongsTo) {
            for (var _i = 0, belongsTo_1 = belongsTo; _i < belongsTo_1.length; _i++) {
                var metadata = belongsTo_1[_i];
                var relationship = data.relationships ? data.relationships[metadata.relationship] : null;
                if (relationship && relationship.data) {
                    var dataRelationship = (relationship.data instanceof Array) ? relationship.data[0] : relationship.data;
                    if (dataRelationship) {
                        var typeName = dataRelationship.type;
                        // tslint:disable-next-line:max-line-length
                        var modelType = Reflect.getMetadata('JsonApiDatastoreConfig', this.internalDatastore.constructor).models[typeName];
                        if (modelType) {
                            var relationshipModel = this.getBelongsToRelationship(modelType, dataRelationship, included, typeName, remainingModels);
                            if (relationshipModel) {
                                this[metadata.propertyName] = relationshipModel;
                            }
                        }
                        else {
                            throw { message: "parseBelongsTo - Model type for relationship " + typeName + " not found." };
                        }
                    }
                }
            }
        }
    };
    JsonApiModel.prototype.getHasManyRelationship = function (modelType, data, included, typeName, remainingModels) {
        var _this = this;
        var relationshipList = [];
        data.forEach(function (item) {
            var relationshipData = lodash_1.find(included, { id: item.id, type: typeName });
            if (relationshipData) {
                var newObject = _this.createOrPeek(modelType, relationshipData);
                var indexOfNewlyFoundModel = remainingModels.indexOf(relationshipData);
                var modelsForProcessing = remainingModels.concat([]);
                if (indexOfNewlyFoundModel !== -1) {
                    modelsForProcessing.splice(indexOfNewlyFoundModel, 1);
                    newObject.syncRelationships(relationshipData, included, modelsForProcessing);
                }
                relationshipList.push(newObject);
            }
        });
        return relationshipList;
    };
    JsonApiModel.prototype.getBelongsToRelationship = function (modelType, data, included, typeName, remainingModels) {
        var id = data.id;
        var relationshipData = lodash_1.find(included, { id: id, type: typeName });
        if (relationshipData) {
            var newObject = this.createOrPeek(modelType, relationshipData);
            var indexOfNewlyFoundModel = remainingModels.indexOf(relationshipData);
            var modelsForProcessing = remainingModels.concat([]);
            if (indexOfNewlyFoundModel !== -1) {
                modelsForProcessing.splice(indexOfNewlyFoundModel, 1);
                newObject.syncRelationships(relationshipData, included, modelsForProcessing);
            }
            return newObject;
        }
        return this.internalDatastore.peekRecord(modelType, id);
    };
    JsonApiModel.prototype.createOrPeek = function (modelType, data) {
        var peek = this.internalDatastore.peekRecord(modelType, data.id);
        if (peek) {
            lodash_1.extend(peek, this.internalDatastore.transformSerializedNamesToPropertyNames(modelType, data.attributes));
            return peek;
        }
        var newObject = this.internalDatastore.deserializeModel(modelType, data);
        this.internalDatastore.addToStore(newObject);
        return newObject;
    };
    return JsonApiModel;
}());
exports.JsonApiModel = JsonApiModel;
//# sourceMappingURL=json-api.model.js.map