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

      if (
        (header === "date" || header === "matchDate") &&
        value instanceof Date
      ) {
        value = Utilities.formatDate(
          value,
          "Asia/Tokyo",
          "yyyy-MM-dd"
        );
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

  const rows = data.map(item => {
    return headers.map(header => {
      let value = item[header];

      if (
        header === "date" ||
        header === "matchDate"
      ) {
        value = normalizeDateText(value);
      }

      if (typeof value === "object" && value !== null) {
        return JSON.stringify(value);
      }

      return value;
    });
  });

  const allValues = [headers, ...rows];

  const range = sheet.getRange(
    1,
    1,
    allValues.length,
    headers.length
  );

  range.setValues(allValues);

  headers.forEach((header, index) => {
    if (
      header === "date" ||
      header === "matchDate"
    ) {
      sheet
        .getRange(
          2,
          index + 1,
          rows.length,
          1
        )
        .setNumberFormat("@");
    }
  });
}

function normalizeDateText(value) {
  if (!value) return "";

  if (value instanceof Date) {
    return Utilities.formatDate(
      value,
      "Asia/Tokyo",
      "yyyy-MM-dd"
    );
  }

  const text = String(value).trim();

  const dateOnlyMatch =
    text.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  if (dateOnlyMatch) {
    return text;
  }

  const isoMatch =
    text.match(/^(\d{4})-(\d{2})-(\d{2})T/);

  if (isoMatch) {
    const date = new Date(text);

    if (!isNaN(date.getTime())) {
      return Utilities.formatDate(
        date,
        "Asia/Tokyo",
        "yyyy-MM-dd"
      );
    }
  }

  return text.replace(/\//g, "-");
}

