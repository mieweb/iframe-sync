document.addEventListener("DOMContentLoaded", () => {
  
  
    // Trigger syntax highlighting for code blocks in the example sidebar
    Prism.highlightAll();
  
    // Dynamically add new iframes
    document.getElementById("addIframeBtn").addEventListener("click", () => {
      const iframe = document.createElement("iframe");
      iframe.className = "sync-iframe";
      iframe.src = "iframe.html";
      document.getElementById("iframeContainer").appendChild(iframe);
    });
  
    // UI: Debug Mode Handling
    const debugPopup = document.getElementById("debugPopup");
    const debugOutput = document.getElementById("debugOutput");
    const debugModeSelect = document.getElementById("debugMode");
    const exampleSidebar = document.getElementById("exampleSidebar");
  
    // Custom formatting function for debug output
    function customFormat(obj, indent = 0) {
      const indentation = '  '.repeat(indent);
      if (Array.isArray(obj)) {
        let lines = ['['];
        for (let i = 0; i < obj.length; i++) {
          lines.push(indentation + '  ' + customFormat(obj[i], indent + 1));
        }
        lines.push(indentation + ']');
        return lines.join('\n');
      } else if (typeof obj === 'object' && obj !== null) {
        let lines = ['{'];
        for (const [k, v] of Object.entries(obj)) {
          lines.push(indentation + '  ' + k + ': ' + customFormat(v, indent + 1));
        }
        lines.push(indentation + '}');
        return lines.join('\n');
      } else if (typeof obj === 'string') {
        return obj;
      } else {
        return String(obj);
      }
    }
  
    debugModeSelect.addEventListener("change", (event) => {
      debugOutput.textContent = "";      // Clear old debug data
      debugPopup.style.display = "none"; // Hide popup by default
  
      switch (event.target.value) {
        case "none":
          broker.setDebugMode(false);
          break;
        case "console":
          broker.setDebugMode(true);
          // Show popup with instructions to open DevTools console
          debugPopup.style.display = "block";
          debugOutput.textContent =
            "Debug logs will appear in your browser's DevTools console.\nOpen the console to view them.";
          exampleSidebar.classList.remove("open");
          break;
        case "function":
          broker.setDebugMode((stateJson) => {
            console.warn("Custom debug function:", stateJson);
          });
          // Show popup with instructions to check console output
          debugPopup.style.display = "block";
          debugOutput.textContent =
            "A custom debug function is logging to the console.\nOpen DevTools console to view the output.";
          exampleSidebar.classList.remove("open");
          break;
        case "element":
          broker.setDebugMode((stateJson) => {
            let raw = JSON.stringify(stateJson);
            try {
              const parsed = JSON.parse(raw);
              raw = customFormat(parsed);
            } catch (err) {
              console.warn("JSON parse error:", err);
            }
            debugOutput.textContent = raw;
          });
          debugPopup.style.display = "block";
          exampleSidebar.classList.remove("open");
          break;
      }
    });
  
    // In your UI script (ui.js or inline):
document.getElementById("exampleHandle").addEventListener("click", () => {
    document.getElementById("exampleSidebar").classList.add("open");
    document.getElementById("exampleHandle").style.display = "none";
  });
  
  document.getElementById("closeExampleBtn").addEventListener("click", () => {
    document.getElementById("exampleSidebar").classList.remove("open");
    document.getElementById("exampleHandle").style.display = "block";
  });
  
  
    // Toggle for Debug Output popup
    document.getElementById("debugHandle").addEventListener("click", () => {
      debugPopup.style.display = (debugPopup.style.display === "block") ? "none" : "block";
      exampleSidebar.classList.remove("open");
    });
  
    // Make the debug popup draggable
    let offsetX = 0, offsetY = 0;
    const debugHeader = document.getElementById("debugPopupHeader");
  
    debugHeader.addEventListener("mousedown", (e) => {
      offsetX = e.clientX - debugPopup.offsetLeft;
      offsetY = e.clientY - debugPopup.offsetTop;
      document.addEventListener("mousemove", mouseMoveHandler);
      document.addEventListener("mouseup", mouseUpHandler);
    });
  
    function mouseMoveHandler(e) {
      debugPopup.style.left = e.clientX - offsetX + "px";
      debugPopup.style.top = e.clientY - offsetY + "px";
    }
    function mouseUpHandler() {
      document.removeEventListener("mousemove", mouseMoveHandler);
      document.removeEventListener("mouseup", mouseUpHandler);
    }
  });
  