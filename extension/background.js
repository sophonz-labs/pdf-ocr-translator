// Toolbar icon opens the side panel, so a long OCR run keeps going while the user browses.
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(console.error);
