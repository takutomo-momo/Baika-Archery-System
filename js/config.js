// ⚠️ GASデプロイWebアプリURL設定枠
const GAS_API_URL = "https://script.google.com/macros/s/AKfycbyjU5ncJllBeJu4ncSeTl5G61AGg-b5118aoxPcGyx7fr4tXKFBZPEyC2uLggwbkwC9aA/exec";

let practiceData = []; let matchData = [];
let masterMembers = ["部員A", "部員B", "部員C"]; let currentArrows = [];
let currentMode = 'practice'; let loggedInMember = ""; let selectedDateStr = "";
let currentCalYear = 0; let currentCalMonth = 0;
let isZoomed = false; let zoomCenter = { x: 150, y: 150 }; let trendChart;
let dailyEnvMetadata = {}; const DEFAULT_PASSWORD = "baika";
