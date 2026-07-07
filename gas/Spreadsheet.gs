function getSpreadsheet() {
  return SpreadsheetApp.getActiveSpreadsheet();
}

function getOrCreateSheet(sheetName) {
  const ss = getSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);

  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
  }

  return sheet;
}

function readSheetData(sheetName) {
  const sheet = getOrCreateSheet(sheetName);
  const values = sheet.getDataRange().getValues();

  if (values.length <= 1) return [];

  const headers = values[0];

  return values.slice(1).map(row => {
    const obj = {};
    headers.forEach((header, index) => {
      let value = row[index];

      if (header === "json" && typeof value === "string") {
        try {
          value = JSON.parse(value);
        } catch (e) {}
      }

      obj[header] = value;
    });

    return obj;
  });
}

function overwriteSheet(sheetName, data) {
  const sheet = getOrCreateSheet(sheetName);
  sheet.clearContents();

  if (!data || data.length === 0) return;

  const headers = Object.keys(data[0]);
  sheet.appendRow(headers);

  data.forEach(item => {
    const row = headers.map(header => {
      const value = item[header];

      if (typeof value === "object" && value !== null) {
        return JSON.stringify(value);
      }

      return value;
    });

    sheet.appendRow(row);
  });
}
