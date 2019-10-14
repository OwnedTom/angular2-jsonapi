"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var tslib_1 = require("tslib");
var core_1 = require("@angular/core");
var http_1 = require("@angular/common/http");
var lodash_1 = require("lodash");
var operators_1 = require("rxjs/operators");
var rxjs_1 = require("rxjs");
var json_api_model_1 = require("../models/json-api.model");
var error_response_model_1 = require("../models/error-response.model");
var json_api_query_data_1 = require("../models/json-api-query-data");
var qs = require("qs");
var symbols_1 = require("../constants/symbols");
/**
 * HACK/FIXME:
 * Type 'symbol' cannot be used as an index type.
 * TypeScript 2.9.x
 * See https://github.com/Microsoft/TypeScript/issues/24587.
 */
// tslint:disable-next-line:variable-name
var AttributeMetadataIndex = symbols_1.AttributeMetadata;
var JsonApiDatastore = /** @class */ (function () {
    function JsonApiDatastore(http) {
        this.http = http;
        this.globalRequestOptions = {};
        this.internalStore = {};
        this.toQueryString = this.datastoreConfig.overrides
            && this.datastoreConfig.overrides.toQueryString ?
            this.datastoreConfig.overrides.toQueryString : this._toQueryString;
    }
    JsonApiDatastore_1 = JsonApiDatastore;
    Object.defineProperty(JsonApiDatastore.prototype, "getDirtyAttributes", {
        get: function () {
            if (this.datastoreConfig.overrides
                && this.datastoreConfig.overrides.getDirtyAttributes) {
                return this.datastoreConfig.overrides.getDirtyAttributes;
            }
            return JsonApiDatastore_1.getDirtyAttributes;
        },
        enumerable: true,
        configurable: true
    });
    /** @deprecated - use findAll method to take all models **/
    JsonApiDatastore.prototype.query = function (modelType, params, headers, customUrl) {
        var _this = this;
        var requestHeaders = this.buildHttpHeaders(headers);
        var url = this.buildUrl(modelType, params, undefined, customUrl);
        return this.http.get(url, { headers: requestHeaders })
            .pipe(operators_1.map(function (res) { return _this.extractQueryData(res, modelType); }), operators_1.catchError(function (res) { return _this.handleError(res); }));
    };
    JsonApiDatastore.prototype.findAll = function (modelType, params, headers, customUrl) {
        var _this = this;
        var url = this.buildUrl(modelType, params, undefined, customUrl);
        var requestOptions = this.buildRequestOptions({ headers: headers, observe: 'response' });
        return this.http.get(url, requestOptions)
            .pipe(operators_1.map(function (res) { return _this.extractQueryData(res, modelType, true); }), operators_1.catchError(function (res) { return _this.handleError(res); }));
    };
    JsonApiDatastore.prototype.findRecord = function (modelType, id, params, headers, customUrl) {
        var _this = this;
        var requestOptions = this.buildRequestOptions({ headers: headers, observe: 'response' });
        var url = this.buildUrl(modelType, params, id, customUrl);
        return this.http.get(url, requestOptions)
            .pipe(operators_1.map(function (res) { return _this.extractRecordData(res, modelType); }), operators_1.catchError(function (res) { return _this.handleError(res); }));
    };
    JsonApiDatastore.prototype.createRecord = function (modelType, data) {
        return new modelType(this, { attributes: data });
    };
    JsonApiDatastore.getDirtyAttributes = function (attributesMetadata) {
        var dirtyData = {};
        for (var propertyName in attributesMetadata) {
            if (attributesMetadata.hasOwnProperty(propertyName)) {
                var metadata = attributesMetadata[propertyName];
                if (metadata.hasDirtyAttributes) {
                    var attributeName = metadata.serializedName != null ? metadata.serializedName : propertyName;
                    dirtyData[attributeName] = metadata.serialisationValue ? metadata.serialisationValue : metadata.newValue;
                }
            }
        }
        return dirtyData;
    };
    JsonApiDatastore.prototype.saveRecord = function (attributesMetadata, model, params, headers, customUrl) {
        var _this = this;
        var modelType = model.constructor;
        var modelConfig = model.modelConfig;
        var typeName = modelConfig.type;
        var relationships = this.getRelationships(model);
        var url = this.buildUrl(modelType, params, model.id, customUrl);
        var httpCall;
        var body = {
            data: {
                relationships: relationships,
                type: typeName,
                id: model.id,
                attributes: this.getDirtyAttributes(attributesMetadata, model)
            }
        };
        var requestOptions = this.buildRequestOptions({ headers: headers, observe: 'response' });
        if (model.id) {
            httpCall = this.http.patch(url, body, requestOptions);
        }
        else {
            httpCall = this.http.post(url, body, requestOptions);
        }
        return httpCall
            .pipe(operators_1.map(function (res) { return [200, 201].indexOf(res.status) !== -1 ? _this.extractRecordData(res, modelType, model) : model; }), operators_1.catchError(function (res) {
            if (res == null) {
                return rxjs_1.of(model);
            }
            return _this.handleError(res);
        }), operators_1.map(function (res) { return _this.updateRelationships(res, relationships); }));
    };
    JsonApiDatastore.prototype.deleteRecord = function (modelType, id, headers, customUrl) {
        var _this = this;
        var requestOptions = this.buildRequestOptions({ headers: headers });
        var url = this.buildUrl(modelType, null, id, customUrl);
        return this.http.delete(url, requestOptions)
            .pipe(operators_1.catchError(function (res) { return _this.handleError(res); }));
    };
    JsonApiDatastore.prototype.peekRecord = function (modelType, id) {
        var type = Reflect.getMetadata('JsonApiModelConfig', modelType).type;
        return this.internalStore[type] ? this.internalStore[type][id] : null;
    };
    JsonApiDatastore.prototype.peekAll = function (modelType) {
        var type = Reflect.getMetadata('JsonApiModelConfig', modelType).type;
        var typeStore = this.internalStore[type];
        return typeStore ? Object.keys(typeStore).map(function (key) { return typeStore[key]; }) : [];
    };
    Object.defineProperty(JsonApiDatastore.prototype, "headers", {
        set: function (headers) {
            this.globalHeaders = headers;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(JsonApiDatastore.prototype, "requestOptions", {
        set: function (requestOptions) {
            this.globalRequestOptions = requestOptions;
        },
        enumerable: true,
        configurable: true
    });
    JsonApiDatastore.prototype.buildUrl = function (modelType, params, id, customUrl) {
        // TODO: use HttpParams instead of appending a string to the url
        var queryParams = this.toQueryString(params);
        if (customUrl) {
            return queryParams ? customUrl + "?" + queryParams : customUrl;
        }
        var modelConfig = Reflect.getMetadata('JsonApiModelConfig', modelType);
        var baseUrl = modelConfig.baseUrl || this.datastoreConfig.baseUrl;
        var apiVersion = modelConfig.apiVersion || this.datastoreConfig.apiVersion;
        var modelEndpointUrl = modelConfig.modelEndpointUrl || modelConfig.type;
        var url = [baseUrl, apiVersion, modelEndpointUrl, id].filter(function (x) { return x; }).join('/');
        return queryParams ? url + "?" + queryParams : url;
    };
    JsonApiDatastore.prototype.getRelationships = function (data) {
        var _this = this;
        var relationships;
        var belongsToMetadata = Reflect.getMetadata('BelongsTo', data) || [];
        var hasManyMetadata = Reflect.getMetadata('HasMany', data) || [];
        var _loop_1 = function (key) {
            if (data.hasOwnProperty(key)) {
                if (data[key] instanceof json_api_model_1.JsonApiModel) {
                    relationships = relationships || {};
                    if (data[key].id) {
                        var entity = belongsToMetadata.find(function (entity) { return entity.propertyName === key; });
                        var relationshipKey = entity.relationship;
                        relationships[relationshipKey] = {
                            data: this_1.buildSingleRelationshipData(data[key])
                        };
                    }
                }
                else if (data[key] instanceof Array) {
                    var entity = hasManyMetadata.find(function (entity) { return entity.propertyName === key; });
                    if (entity && this_1.isValidToManyRelation(data[key])) {
                        relationships = relationships || {};
                        var relationshipKey = entity.relationship;
                        var relationshipData = data[key]
                            .filter(function (model) { return model.id; })
                            .map(function (model) { return _this.buildSingleRelationshipData(model); });
                        relationships[relationshipKey] = {
                            data: relationshipData
                        };
                    }
                }
            }
        };
        var this_1 = this;
        for (var key in data) {
            _loop_1(key);
        }
        return relationships;
    };
    JsonApiDatastore.prototype.isValidToManyRelation = function (objects) {
        if (!objects.length) {
            return true;
        }
        var isJsonApiModel = objects.every(function (item) { return item instanceof json_api_model_1.JsonApiModel; });
        if (!isJsonApiModel) {
            return false;
        }
        var types = objects.map(function (item) { return item.modelConfig.modelEndpointUrl || item.modelConfig.type; });
        return types
            .filter(function (type, index, self) { return self.indexOf(type) === index; })
            .length === 1;
    };
    JsonApiDatastore.prototype.buildSingleRelationshipData = function (model) {
        var relationshipType = model.modelConfig.type;
        var relationShipData = { type: relationshipType };
        if (model.id) {
            relationShipData.id = model.id;
        }
        else {
            var attributesMetadata = Reflect.getMetadata('Attribute', model);
            relationShipData.attributes = this.getDirtyAttributes(attributesMetadata, model);
        }
        return relationShipData;
    };
    JsonApiDatastore.prototype.extractQueryData = function (response, modelType, withMeta) {
        var _this = this;
        if (withMeta === void 0) { withMeta = false; }
        var body = response.body;
        var models = [];
        body.data.forEach(function (data) {
            var model = _this.deserializeModel(modelType, data);
            _this.addToStore(model);
            if (body.included) {
                model.syncRelationships(data, body.included);
                _this.addToStore(model);
            }
            models.push(model);
        });
        if (withMeta && withMeta === true) {
            return new json_api_query_data_1.JsonApiQueryData(models, this.parseMeta(body, modelType));
        }
        return models;
    };
    JsonApiDatastore.prototype.deserializeModel = function (modelType, data) {
        data.attributes = this.transformSerializedNamesToPropertyNames(modelType, data.attributes);
        return new modelType(this, data);
    };
    JsonApiDatastore.prototype.extractRecordData = function (res, modelType, model) {
        var body = res.body;
        // Error in Angular < 5.2.4 (see https://github.com/angular/angular/issues/20744)
        // null is converted to 'null', so this is temporary needed to make testcase possible
        // (and to avoid a decrease of the coverage)
        if (!body || body === 'null') {
            throw new Error('no body in response');
        }
        if (!body.data) {
            if (res.status === 201 || !model) {
                throw new Error('expected data in response');
            }
            return model;
        }
        if (model) {
            model.modelInitialization = true;
            model.id = body.data.id;
            Object.assign(model, body.data.attributes);
            model.modelInitialization = false;
        }
        var deserializedModel = model || this.deserializeModel(modelType, body.data);
        this.addToStore(deserializedModel);
        if (body.included) {
            deserializedModel.syncRelationships(body.data, body.included);
            this.addToStore(deserializedModel);
        }
        return deserializedModel;
    };
    JsonApiDatastore.prototype.handleError = function (error) {
        if (error instanceof http_1.HttpErrorResponse &&
            error.error instanceof Object &&
            error.error.errors &&
            error.error.errors instanceof Array) {
            var errors = new error_response_model_1.ErrorResponse(error.error.errors);
            return rxjs_1.throwError(errors);
        }
        return rxjs_1.throwError(error);
    };
    JsonApiDatastore.prototype.parseMeta = function (body, modelType) {
        var metaModel = Reflect.getMetadata('JsonApiModelConfig', modelType).meta;
        return new metaModel(body);
    };
    /** @deprecated - use buildHttpHeaders method to build request headers **/
    JsonApiDatastore.prototype.getOptions = function (customHeaders) {
        return {
            headers: this.buildHttpHeaders(customHeaders),
        };
    };
    JsonApiDatastore.prototype.buildHttpHeaders = function (customHeaders) {
        var _this = this;
        var requestHeaders = new http_1.HttpHeaders({
            Accept: 'application/vnd.api+json',
            'Content-Type': 'application/vnd.api+json'
        });
        if (this.globalHeaders) {
            this.globalHeaders.keys().forEach(function (key) {
                if (_this.globalHeaders.has(key)) {
                    requestHeaders = requestHeaders.set(key, _this.globalHeaders.get(key));
                }
            });
        }
        if (customHeaders) {
            customHeaders.keys().forEach(function (key) {
                if (customHeaders.has(key)) {
                    requestHeaders = requestHeaders.set(key, customHeaders.get(key));
                }
            });
        }
        return requestHeaders;
    };
    JsonApiDatastore.prototype.buildRequestOptions = function (customOptions) {
        if (customOptions === void 0) { customOptions = {}; }
        var httpHeaders = this.buildHttpHeaders(customOptions.headers);
        var requestOptions = Object.assign(customOptions, {
            headers: httpHeaders
        });
        return Object.assign(this.globalRequestOptions, requestOptions);
    };
    JsonApiDatastore.prototype._toQueryString = function (params) {
        return qs.stringify(params, { arrayFormat: 'brackets' });
    };
    JsonApiDatastore.prototype.addToStore = function (modelOrModels) {
        var models = Array.isArray(modelOrModels) ? modelOrModels : [modelOrModels];
        var type = models[0].modelConfig.type;
        var typeStore = this.internalStore[type];
        if (!typeStore) {
            typeStore = this.internalStore[type] = {};
        }
        for (var _i = 0, models_1 = models; _i < models_1.length; _i++) {
            var model = models_1[_i];
            typeStore[model.id] = model;
        }
    };
    JsonApiDatastore.prototype.resetMetadataAttributes = function (res, attributesMetadata, modelType) {
        for (var propertyName in attributesMetadata) {
            if (attributesMetadata.hasOwnProperty(propertyName)) {
                var metadata = attributesMetadata[propertyName];
                if (metadata.hasDirtyAttributes) {
                    metadata.hasDirtyAttributes = false;
                }
            }
        }
        res[AttributeMetadataIndex] = attributesMetadata;
        return res;
    };
    JsonApiDatastore.prototype.updateRelationships = function (model, relationships) {
        var modelsTypes = Reflect.getMetadata('JsonApiDatastoreConfig', this.constructor).models;
        for (var relationship in relationships) {
            if (relationships.hasOwnProperty(relationship) && model.hasOwnProperty(relationship)) {
                var relationshipModel = model[relationship];
                var hasMany = Reflect.getMetadata('HasMany', relationshipModel);
                var propertyHasMany = lodash_1.find(hasMany, function (property) {
                    return modelsTypes[property.relationship] === model.constructor;
                });
                if (propertyHasMany) {
                    relationshipModel[propertyHasMany.propertyName] = relationshipModel[propertyHasMany.propertyName] || [];
                    var indexOfModel = relationshipModel[propertyHasMany.propertyName].indexOf(model);
                    if (indexOfModel === -1) {
                        relationshipModel[propertyHasMany.propertyName].push(model);
                    }
                    else {
                        relationshipModel[propertyHasMany.propertyName][indexOfModel] = model;
                    }
                }
            }
        }
        return model;
    };
    Object.defineProperty(JsonApiDatastore.prototype, "datastoreConfig", {
        get: function () {
            var configFromDecorator = Reflect.getMetadata('JsonApiDatastoreConfig', this.constructor);
            return Object.assign(configFromDecorator, this.config);
        },
        enumerable: true,
        configurable: true
    });
    JsonApiDatastore.prototype.transformSerializedNamesToPropertyNames = function (modelType, attributes) {
        var serializedNameToPropertyName = this.getModelPropertyNames(modelType.prototype);
        var properties = {};
        Object.keys(serializedNameToPropertyName).forEach(function (serializedName) {
            if (attributes && attributes[serializedName] !== null && attributes[serializedName] !== undefined) {
                properties[serializedNameToPropertyName[serializedName]] = attributes[serializedName];
            }
        });
        return properties;
    };
    JsonApiDatastore.prototype.getModelPropertyNames = function (model) {
        return Reflect.getMetadata('AttributeMapping', model) || [];
    };
    var JsonApiDatastore_1;
    JsonApiDatastore = JsonApiDatastore_1 = tslib_1.__decorate([
        core_1.Injectable(),
        tslib_1.__metadata("design:paramtypes", [http_1.HttpClient])
    ], JsonApiDatastore);
    return JsonApiDatastore;
}());
exports.JsonApiDatastore = JsonApiDatastore;
//# sourceMappingURL=json-api-datastore.service.js.map