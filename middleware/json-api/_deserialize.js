const _ = require('lodash')
const pluralize = require('pluralize')

function collection(items, included) {
  return items.map(item => { return resource.call(this, item, included) })
}

function resource(item, included) {
  let model = this.modelFor(pluralize.singular(item.type))
  let deserializedModel = {}

  if(item.id) {
    deserializedModel.id = item.id
  }

  _.forOwn(model.attributes, (value, key)=> {
    if(isRelationship(value)) {
      deserializedModel[key] = attachRelationsFor.call(this, model, value, item, included)
    }else{
      deserializedModel[key] = item.attributes[key]
    }
  })
  return deserializedModel
}

function attachRelationsFor(model, attribute, item, included) {
  let relation = null
  if(attribute.jsonApi === 'hasOne') {
    relation = attachHasOneFor.call(this, model, attribute, item, included)
  }
  if(attribute.jsonApi === 'hasMany') {
    relation = attachHasManyFor.call(this, model, attribute, item, included)
  }
  return relation
}

function attachHasOneFor(model, attribute, item, included) {
  if(!item.relationships) {
    return null
  }
  let relatedItems = relatedItemsFor(model, attribute, item, included)
  if(relatedItems && relatedItems[0]) {
    return resource.call(this, relatedItems[0], included)
  }else{
    return null
  }
}

function attachHasManyFor(model, attribute, item, included) {
  if(!item.relationships) {
    return null
  }
  let relatedItems = relatedItemsFor(model, attribute, item, included)
  if(relatedItems && relatedItems.length > 0) {
    return collection.call(this, relatedItems, included)
  }
  return []
}

function isRelationship(attribute) {
  return (_.isPlainObject(attribute) && _.includes(['hasOne', 'hasMany'], attribute.jsonApi))
}


/*
*   == relatedItemsFor
*   Returns unserialized related items.
*/
function relatedItemsFor(model, attribute, item, included) {
  let relationName = _.findKey(model.attributes, attribute)
  let relationMap = _.get(item.relationships, [relationName, 'data'], false)
  if(!relationMap) {
    return []
  }

  if(_.isArray(relationMap)) {
    return _.flatten(_.map(relationMap, function(relationMapItem) {
      return _.filter(included, (includedItem) => {
        return isRelatedItemFor(attribute, includedItem, relationMapItem)
      })
    }))
  }else{
    return _.filter(included, (includedItem) => {
      return isRelatedItemFor(attribute, includedItem, relationMap)
    })
  }
}

function isRelatedItemFor(attribute, relatedItem, relationMapItem) {
  let passesFilter = true
  if(attribute.filter) {
    passesFilter = _.matches(relatedItem.attributes, attribute.filter)
  }
  return(
    relatedItem.id    === relationMapItem.id &&
    relatedItem.type  === relationMapItem.type &&
    passesFilter
  )
}

module.exports = {
  resource: resource,
  collection: collection
}
