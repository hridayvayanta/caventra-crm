/**
 * CAVENTRA CRM — Cloud Firestore REST API Client
 * 
 * Authenticates using the Google Apps Script OAuth Token (ScriptApp.getOAuthToken())
 * with the 'https://www.googleapis.com/auth/datastore' scope.
 * 
 * 100% Free, Zero-Billing compliant via Google Cloud IAM.
 */

var FirestoreClient = (function () {

  function getBaseUrl() {
    var projectId = Config.getProjectId();
    if (!projectId) {
      throw new Error('Firestore Project ID is not configured in ScriptProperties.');
    }
    return 'https://firestore.googleapis.com/v1/projects/' + encodeURIComponent(projectId) + '/databases/(default)/documents';
  }

  function getAuthHeader() {
    var token = ScriptApp.getOAuthToken();
    if (!token) {
      throw new Error('Failed to acquire OAuth token from ScriptApp.');
    }
    return {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    };
  }

  /**
   * Serialize JavaScript value to Firestore REST API field format
   */
  function serializeValue(val) {
    if (val === null || val === undefined) {
      return { nullValue: null };
    }
    if (typeof val === 'boolean') {
      return { booleanValue: val };
    }
    if (typeof val === 'number') {
      if (Number.isInteger(val)) {
        return { integerValue: String(val) };
      }
      return { doubleValue: val };
    }
    if (val instanceof Date) {
      return { timestampValue: val.toISOString() };
    }
    if (Array.isArray(val)) {
      return {
        arrayValue: {
          values: val.map(serializeValue)
        }
      };
    }
    if (typeof val === 'object') {
      var mapFields = {};
      for (var k in val) {
        if (val.hasOwnProperty(k)) {
          mapFields[k] = serializeValue(val[k]);
        }
      }
      return { mapValue: { fields: mapFields } };
    }
    // Default to string
    return { stringValue: String(val) };
  }

  /**
   * Serialize plain JS object to Firestore document fields
   */
  function serializeDocument(obj) {
    var fields = {};
    for (var key in obj) {
      if (obj.hasOwnProperty(key)) {
        fields[key] = serializeValue(obj[key]);
      }
    }
    return { fields: fields };
  }

  /**
   * Deserialize Firestore REST format to plain JS object
   */
  function deserializeValue(firestoreVal) {
    if (!firestoreVal) return null;
    if ('stringValue' in firestoreVal) return firestoreVal.stringValue;
    if ('integerValue' in firestoreVal) return parseInt(firestoreVal.integerValue, 10);
    if ('doubleValue' in firestoreVal) return firestoreVal.doubleValue;
    if ('booleanValue' in firestoreVal) return firestoreVal.booleanValue;
    if ('timestampValue' in firestoreVal) return firestoreVal.timestampValue;
    if ('nullValue' in firestoreVal) return null;
    if ('arrayValue' in firestoreVal) {
      var arr = firestoreVal.arrayValue.values || [];
      return arr.map(deserializeValue);
    }
    if ('mapValue' in firestoreVal) {
      var fields = firestoreVal.mapValue.fields || {};
      var obj = {};
      for (var k in fields) {
        if (fields.hasOwnProperty(k)) {
          obj[k] = deserializeValue(fields[k]);
        }
      }
      return obj;
    }
    return null;
  }

  function deserializeDocument(firestoreDoc) {
    if (!firestoreDoc || !firestoreDoc.fields) return null;
    var result = {};
    var fields = firestoreDoc.fields;
    for (var key in fields) {
      if (fields.hasOwnProperty(key)) {
        result[key] = deserializeValue(fields[key]);
      }
    }
    // Extract document ID from full resource name
    if (firestoreDoc.name) {
      var parts = firestoreDoc.name.split('/');
      result._id = parts[parts.length - 1];
    }
    return result;
  }

  return {
    /**
     * Get a document by collection and ID (returns null if 404)
     */
    getDocument: function (collectionName, docId) {
      var url = getBaseUrl() + '/' + encodeURIComponent(collectionName) + '/' + encodeURIComponent(docId);
      var options = {
        method: 'get',
        headers: getAuthHeader(),
        muteHttpExceptions: true
      };

      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();

      if (code === 200) {
        return deserializeDocument(JSON.parse(response.getContentText()));
      }
      if (code === 404) {
        return null;
      }
      throw new Error('Firestore getDocument failed (' + code + '): ' + response.getContentText());
    },

    /**
     * Create or update document using PATCH (Idempotent upsert)
     */
    upsertDocument: function (collectionName, docId, data) {
      var url = getBaseUrl() + '/' + encodeURIComponent(collectionName) + '/' + encodeURIComponent(docId);
      var payload = serializeDocument(data);

      var options = {
        method: 'patch',
        headers: getAuthHeader(),
        payload: JSON.stringify(payload),
        muteHttpExceptions: true
      };

      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();

      if (code === 200 || code === 201) {
        return deserializeDocument(JSON.parse(response.getContentText()));
      }
      throw new Error('Firestore upsertDocument failed (' + code + '): ' + response.getContentText());
    },

    /**
     * Run a structured query on a collection
     */
    queryByField: function (collectionName, fieldName, value) {
      var url = getBaseUrl() + ':runQuery';
      var queryPayload = {
        structuredQuery: {
          from: [{ collectionId: collectionName }],
          where: {
            fieldFilter: {
              field: { fieldPath: fieldName },
              op: 'EQUAL',
              value: serializeValue(value)
            }
          },
          limit: 1
        }
      };

      var options = {
        method: 'post',
        headers: getAuthHeader(),
        payload: JSON.stringify(queryPayload),
        muteHttpExceptions: true
      };

      var response = UrlFetchApp.fetch(url, options);
      var code = response.getResponseCode();

      if (code === 200) {
        var rawResults = JSON.parse(response.getContentText());
        var matched = [];
        for (var i = 0; i < rawResults.length; i++) {
          if (rawResults[i].document) {
            matched.push(deserializeDocument(rawResults[i].document));
          }
        }
        return matched;
      }
      throw new Error('Firestore query failed (' + code + '): ' + response.getContentText());
    }
  };
})();
