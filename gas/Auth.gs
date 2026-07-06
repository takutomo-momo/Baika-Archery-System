function checkPassword(memberName, password) {
  const metadata = readSheetData(SHEET_NAMES.METADATA);
  const passwordRow = metadata.find(row => row.key === "memberPasswords");

  let passwords = {};

  if (passwordRow && passwordRow.json) {
    passwords = passwordRow.json;
  }

  const correctPassword = passwords[memberName] || DEFAULT_DATA.DEFAULT_PASSWORD;

  return password === correctPassword;
}