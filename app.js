(function () {
  const WEBHOOK_URL =
    "https://girishpathria.app.n8n.cloud/webhook-test/76c53030-e1fd-4de2-86a4-15d253d4779b";

  const $ = (id) => document.getElementById(id);
  const dropzone = $("dropzone");
  const fileInput = $("file-input");
  const uploadError = $("upload-error");
  const viewer = $("viewer");
  const pdfFrame = $("pdf-frame");
  const fileName = $("file-name");
  const fileMeta = $("file-meta");
  const replaceBtn = $("replace-btn");
  const form = $("chat-form");
  const input = $("chat-input");
  const sendBtn = $("send-btn");
  const messages = $("messages");
  const suggestions = $("suggestions");

  let currentUrl = null;
  let currentFile = null;
  let busy = false;

  function formatSize(bytes) {
    return bytes < 1024 * 1024
      ? Math.max(1, Math.round(bytes / 1024)) + " KB"
      : (bytes / (1024 * 1024)).toFixed(1) + " MB";
  }

  /* ---------- Upload & preview ---------- */
  function handleFile(file) {
    uploadError.textContent = "";
    if (!file) return;
    const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
    if (!isPdf) {
      uploadError.textContent = "That doesn't look like a PDF. Please choose a .pdf file.";
      return;
    }
    if (currentUrl) URL.revokeObjectURL(currentUrl);
    currentFile = file;
    currentUrl = URL.createObjectURL(file);
    // The browser's native PDF viewer renders inside the frame and scrolls on its own.
    pdfFrame.src = currentUrl + "#view=FitH";

    fileName.textContent = file.name;
    fileName.title = file.name;
    fileName.hidden = false;
    replaceBtn.hidden = false;
    fileMeta.textContent = formatSize(file.size);

    dropzone.hidden = true;
    viewer.hidden = false;
    addMessage("bot", "Loaded \"" + file.name + "\". What would you like to know?");
  }

  fileInput.addEventListener("change", () => {
    handleFile(fileInput.files[0]);
    fileInput.value = "";
  });
  replaceBtn.addEventListener("click", () => fileInput.click());

  ["dragenter", "dragover"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add("dragover");
    })
  );
  ["dragleave", "drop"].forEach((evt) =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove("dragover");
    })
  );
  dropzone.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

  // Dropping a file anywhere else on the page shouldn't navigate away to the PDF.
  ["dragover", "drop"].forEach((evt) =>
    window.addEventListener(evt, (e) => e.preventDefault())
  );
  viewer.addEventListener("drop", (e) => handleFile(e.dataTransfer.files[0]));

  /* ---------- Chat ---------- */
  function addMessage(role, text) {
    const div = document.createElement("div");
    div.className = "msg " + role;
    div.textContent = text;
    messages.appendChild(div);
    scrollDown();
    return div;
  }

  function scrollDown() {
    messages.scrollTop = messages.scrollHeight;
  }

  // Assistant reply: answer, then citations and reasoning beneath it.
  function addAnswer(data) {
    const div = document.createElement("div");
    div.className = "msg bot answer";

    const body = document.createElement("div");
    body.className = "answer-text";
    body.textContent = data.response;
    div.appendChild(body);

    if (data.citation.length) {
      const sec = document.createElement("div");
      sec.className = "answer-section";
      const h = document.createElement("div");
      h.className = "answer-label";
      h.textContent = data.citation.length > 1 ? "Citations" : "Citation";
      sec.appendChild(h);
      data.citation.forEach((c) => {
        const q = document.createElement("blockquote");
        q.className = "citation";
        q.textContent = c;
        sec.appendChild(q);
      });
      div.appendChild(sec);
    }

    if (data.reasoning) {
      const sec = document.createElement("div");
      sec.className = "answer-section";
      const h = document.createElement("div");
      h.className = "answer-label";
      h.textContent = "Reasoning";
      const p = document.createElement("div");
      p.className = "reasoning";
      p.textContent = data.reasoning;
      sec.append(h, p);
      div.appendChild(sec);
    }

    messages.appendChild(div);
    scrollDown();
  }

  // Normalize whatever n8n returns into { response, citation[], reasoning }.
  function normalize(raw) {
    if (Array.isArray(raw)) raw = raw[0];
    if (typeof raw === "string") raw = JSON.parse(raw);
    if (raw && typeof raw.output === "string") raw = JSON.parse(raw.output);
    if (!raw || typeof raw.response !== "string") throw new Error("Unexpected response shape");
    return {
      response: raw.response,
      citation: Array.isArray(raw.citation) ? raw.citation.map(String) : [],
      reasoning: typeof raw.reasoning === "string" ? raw.reasoning : "",
    };
  }

  async function askWebhook(question) {
    const body = new FormData();
    body.append("file", currentFile, currentFile.name);
    body.append("message", question);
    const res = await fetch(WEBHOOK_URL, { method: "POST", body });
    if (!res.ok) throw new Error("Webhook returned " + res.status);
    const text = await res.text();
    return normalize(text);
  }

  async function send(text) {
    text = text.trim();
    if (!text || busy) return;
    suggestions.hidden = true;
    addMessage("user", text);

    if (!currentFile) {
      addMessage("bot", "Please upload a PDF contract first, then ask your question.");
      return;
    }

    busy = true;
    sendBtn.disabled = true;
    const typing = document.createElement("div");
    typing.className = "msg bot typing";
    typing.setAttribute("aria-label", "Assistant is typing");
    typing.innerHTML = "<span></span><span></span><span></span>";
    messages.appendChild(typing);
    scrollDown();

    try {
      const data = await askWebhook(text);
      typing.remove();
      addAnswer(data);
    } catch (err) {
      typing.remove();
      console.error(err);
      addMessage("bot", "Sorry, I couldn't get an answer from the contract service. Please try again.");
    } finally {
      busy = false;
      sendBtn.disabled = !input.value.trim();
    }
  }

  input.addEventListener("input", () => {
    sendBtn.disabled = busy || !input.value.trim();
  });

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    const text = input.value;
    input.value = "";
    sendBtn.disabled = true;
    send(text);
    input.focus();
  });

  suggestions.addEventListener("click", (e) => {
    const chip = e.target.closest(".chip");
    if (chip) send(chip.textContent);
  });
})();
