export function Relationship(options: { resource: string } = { resource: '' }): PropertyDecorator {
  return function (target: any, propertyName: string) {
    const annotations = Reflect.getMetadata('Relationship', target) || [];

    annotations.push({
      propertyName,
      relationship: options.resource || propertyName
    });

    Reflect.defineMetadata('Relationship', annotations, target);
  };
}
