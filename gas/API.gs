function handleGet(e) {
  const data = {
    practice: readSheetData(SHEET_NAMES.PRACTICE),
    match: readSheetData(SHEET_NAMES.MATCH),
    metadata: readSheetData(SHEET_NAMES.METADATA)
  };

  return createJsonResponse(data);
}

function handlePost(e) {
  const payload = JSON.parse(e.postData.contents);
  const mode = payload.mode;
  const data = payload.data || [];

  if (mode === "practice") {
    overwriteSheet(SHEET_NAMES.PRACTICE, data);
  }

  if (mode === "match") {
    overwriteSheet(SHEET_NAMES.MATCH, data);
  }

  if (mode === "metadata") {
    overwriteSheet(SHEET_NAMES.METADATA, data);
  }

  return createJsonResponse({
    success: true,
    mode: mode
  });
}

function createJsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}