
document.addEventListener("DOMContentLoaded", async function () {
  "use strict";

  const API = "/api/risks";
  const $ = (selector) => document.querySelector(selector);
  const byId = (id) => document.getElementById(id);

  const messageBox = byId("messageBox");
  const connectionStatus = byId("connectionStatus");
  const riskDialog = byId("riskDialog");
  const riskForm = byId("riskForm");

  let risks = [];

  function showMessage(message, isError = false) {
    if (!messageBox) return;
    messageBox.textContent = message;
    messageBox.style.color = isError ? "#dc4658" : "#14966c";
  }

  async function request(url, options = {}) {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...(options.body ? { "Content-Type": "application/json" } : {}),
        ...(options.headers || {})
      }
    });

    const text = await response.text();
    let data = null;

    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = { message: text };
      }
    }

    if (response.status === 401) {
      window.location.replace("/login.html");
      throw new Error("Your session expired. Please log in again.");
    }

    if (!response.ok) {
      throw new Error(data?.message || "Request failed: " + response.status);
    }

    return data;
  }

  // Confirm the user is logged in before loading dashboard data.
  try {
    await request("/api/auth/me");
  } catch (error) {
    console.error("Login check:", error.message);
    if (error.message.includes("fetch")) {
      showMessage("Cannot reach the backend. Check that the server is running.", true);
    }
    return;
  }

  function showSection(sectionId) {
    document.querySelectorAll(".dashboard-section").forEach(function (section) {
      section.hidden = section.id !== sectionId;
    });

    document.querySelectorAll(".nav-btn").forEach(function (button) {
      button.classList.toggle("active", button.dataset.section === sectionId);
    });

    const titles = {
      overview: "Dashboard Overview",
      risks: "Risk Management",
      assets: "Assets",
      threats: "Threats",
      monitoring: "Monitoring",
      reports: "Reports"
    };

    byId("pageTitle").textContent = titles[sectionId] || "Dashboard";

    if (sectionId === "assets") renderAssets();
    if (sectionId === "threats") renderThreats();
    if (sectionId === "monitoring") checkMonitoring();
  }

  function setText(id, value) {
    const element = byId(id);
    if (element) element.textContent = value;
  }

  function updateStatistics() {
    const total = risks.length;
    const critical = risks.filter((risk) => risk.severity === "Critical").length;
    const open = risks.filter((risk) => (risk.status || "Open") === "Open").length;
    const resolved = risks.filter((risk) => risk.status === "Resolved").length;

    setText("totalRisks", total);
    setText("criticalRisks", critical);
    setText("openRisks", open);
    setText("resolvedRisks", resolved);

    setText("riskPageTotal", total);
    setText("riskPageCritical", critical);
    setText("riskPageOpen", open);

    setText("reportTotal", total);
    setText("reportCritical", critical);
    setText("reportResolved", resolved);
  }

  function addCell(row, value) {
    const cell = document.createElement("td");
    cell.textContent = value == null || value === "" ? "—" : String(value);
    row.appendChild(cell);
    return cell;
  }

  function makeSeverityBadge(value) {
    const badge = document.createElement("span");
    badge.className = "severity-badge severity-" +
      String(value || "Low").toLowerCase();
    badge.textContent = value || "Low";
    return badge;
  }

  function renderOverviewTable() {
    const body = $("#overviewRisksTable tbody");
    if (!body) return;

    body.replaceChildren();

    if (!risks.length) {
      const row = document.createElement("tr");
      const cell = addCell(row, "No risks recorded yet.");
      cell.colSpan = 5;
      body.appendChild(row);
      return;
    }

    risks.slice(0, 5).forEach((risk) => {
      const row = document.createElement("tr");
      addCell(row, risk.title);
      addCell(row, risk.asset);
      addCell(row, risk.score);

      const severityCell = document.createElement("td");
      severityCell.appendChild(makeSeverityBadge(risk.severity));
      row.appendChild(severityCell);

      addCell(row, risk.status || "Open");
      body.appendChild(row);
    });
  }

  function renderRisksTable() {
    const body = $("#risksTable tbody");
    if (!body) return;

    body.replaceChildren();

    if (!risks.length) {
      const row = document.createElement("tr");
      const cell = addCell(row, "No risks yet. Select Add New Risk to create one.");
      cell.colSpan = 8;
      body.appendChild(row);
      return;
    }

    risks.forEach((risk) => {
      const row = document.createElement("tr");

      addCell(row, risk.title);
      addCell(row, risk.asset);
      addCell(row, risk.likelihood);
      addCell(row, risk.impact);
      addCell(row, risk.score);

      const severityCell = document.createElement("td");
      severityCell.appendChild(makeSeverityBadge(risk.severity));
      row.appendChild(severityCell);

      addCell(row, risk.status || "Open");

      const actionsCell = document.createElement("td");

      const editButton = document.createElement("button");
      editButton.type = "button";
      editButton.className = "secondary-btn";
      editButton.textContent = "Edit";
      editButton.dataset.action = "edit";
      editButton.dataset.id = risk._id;

      const deleteButton = document.createElement("button");
      deleteButton.type = "button";
      deleteButton.className = "secondary-btn";
      deleteButton.textContent = "Delete";
      deleteButton.dataset.action = "delete";
      deleteButton.dataset.id = risk._id;

      actionsCell.append(editButton, document.createTextNode(" "), deleteButton);
      row.appendChild(actionsCell);
      body.appendChild(row);
    });
  }

  function renderAssets() {
    const body = $("#assetsTable tbody");
    if (!body) return;

    body.replaceChildren();

    const assets = new Map();

    risks.forEach((risk) => {
      const name = risk.asset?.trim() || "Unspecified asset";
      if (!assets.has(name)) {
        assets.set(name, []);
      }
      assets.get(name).push(risk);
    });

    if (!assets.size) {
      const row = document.createElement("tr");
      const cell = addCell(row, "No assets recorded yet.");
      cell.colSpan = 3;
      body.appendChild(row);
      return;
    }

    assets.forEach((assetRisks, name) => {
      const row = document.createElement("tr");
      addCell(row, name);
      addCell(row, assetRisks.length);

      const order = { Low: 1, Medium: 2, High: 3, Critical: 4 };
      const highest = assetRisks.reduce((current, risk) =>
        (order[risk.severity] || 0) > (order[current] || 0)
          ? risk.severity
          : current,
        "Low"
      );

      const cell = document.createElement("td");
      cell.appendChild(makeSeverityBadge(highest));
      row.appendChild(cell);
      body.appendChild(row);
    });
  }

  function renderThreats() {
    const container = byId("threatSummary");
    if (!container) return;

    container.replaceChildren();

    ["Critical", "High", "Medium", "Low"].forEach((severity) => {
      const count = risks.filter((risk) => risk.severity === severity).length;
      const card = document.createElement("article");
      card.className = "stat-card";

      const label = document.createElement("span");
      label.textContent = severity + " severity";

      const number = document.createElement("p");
      number.className = "stat-number";
      number.textContent = count;

      card.append(label, number);
      container.appendChild(card);
    });
  }

  async function loadRisks() {
    if (connectionStatus) connectionStatus.textContent = "Loading...";

    try {
      const data = await request(API);

      if (!Array.isArray(data)) {
        throw new Error("The backend returned an unexpected response.");
      }

      risks = data;
      updateStatistics();
      renderOverviewTable();
      renderRisksTable();

      if (connectionStatus) connectionStatus.textContent = "Connected";
      showMessage("Risk data updated.");
    } catch (error) {
      if (connectionStatus) connectionStatus.textContent = "Connection error";
      showMessage(error.message, true);
      console.error("Unable to load risks:", error);
    }
  }

  function openNewRiskDialog() {
    riskForm.reset();
    byId("riskId").value = "";
    byId("riskDialogTitle").textContent = "Add new risk";
    byId("riskStatus").value = "Open";
    byId("riskFormMessage").textContent = "";
    riskDialog.showModal();
  }

  function openEditRiskDialog(id) {
    const risk = risks.find((item) => item._id === id);
    if (!risk) {
      showMessage("Could not find that risk.", true);
      return;
    }

    riskForm.reset();
    byId("riskId").value = risk._id;
    byId("riskTitle").value = risk.title || "";
    byId("riskDescription").value = risk.description || "";
    byId("riskAsset").value = risk.asset || "";
    byId("riskLikelihood").value = String(risk.likelihood);
    byId("riskImpact").value = String(risk.impact);
    byId("riskStatus").value = risk.status || "Open";
    byId("riskDialogTitle").textContent = "Edit risk";
    byId("riskFormMessage").textContent = "";
    riskDialog.showModal();
  }

  async function saveRisk(event) {
    event.preventDefault();

    const id = byId("riskId").value;
    const payload = {
      title: byId("riskTitle").value.trim(),
      description: byId("riskDescription").value.trim(),
      asset: byId("riskAsset").value.trim(),
      likelihood: Number(byId("riskLikelihood").value),
      impact: Number(byId("riskImpact").value),
      status: byId("riskStatus").value
    };

    if (!payload.title) {
      byId("riskFormMessage").textContent = "Enter a risk title.";
      return;
    }

    const saveButton = byId("saveRiskButton");
    saveButton.disabled = true;
    saveButton.textContent = "Saving...";

    try {
      await request(id ? API + "/" + encodeURIComponent(id) : API, {
        method: id ? "PUT" : "POST",
        body: JSON.stringify(payload)
      });

      riskDialog.close();
      showMessage(id ? "Risk updated successfully." : "Risk added successfully.");
      await loadRisks();
      showSection("risks");
    } catch (error) {
      byId("riskFormMessage").textContent = error.message;
      console.error("Unable to save risk:", error);
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save risk";
    }
  }

  async function deleteRisk(id) {
    const risk = risks.find((item) => item._id === id);
    if (!risk) return;

    if (!window.confirm('Delete "' + risk.title + '"? This cannot be undone.')) {
      return;
    }

    try {
      await request(API + "/" + encodeURIComponent(id), { method: "DELETE" });
      showMessage("Risk deleted successfully.");
      await loadRisks();
    } catch (error) {
      showMessage(error.message, true);
      console.error("Unable to delete risk:", error);
    }
  }

  function checkMonitoring() {
    setText("monitorStatus", connectionStatus?.textContent || "Unknown");
    setText(
      "monitorDescription",
      "The dashboard retrieves risk records from the backend API and stores them in MongoDB."
    );
  }

  // Sidebar navigation
  document.querySelectorAll(".nav-btn").forEach((button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.section);
    });
  });

  // Buttons that navigate to a section
  document.querySelectorAll("[data-go-section]").forEach((button) => {
    button.addEventListener("click", () => {
      showSection(button.dataset.goSection);
    });
  });

  // Risk form and dialog
  byId("addRiskButton")?.addEventListener("click", openNewRiskDialog);
  byId("closeRiskDialog")?.addEventListener("click", () => riskDialog.close());
  byId("cancelRiskButton")?.addEventListener("click", () => riskDialog.close());
  riskForm?.addEventListener("submit", saveRisk);

  // Risk table Edit/Delete actions
  $("#risksTable tbody")?.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) return;

    if (button.dataset.action === "edit") {
      openEditRiskDialog(button.dataset.id);
    } else if (button.dataset.action === "delete") {
      deleteRisk(button.dataset.id);
    }
  });

  // Refresh controls
  byId("refreshButton")?.addEventListener("click", loadRisks);
  byId("overviewRefreshButton")?.addEventListener("click", loadRisks);
  byId("monitorRefreshButton")?.addEventListener("click", async () => {
    await loadRisks();
    checkMonitoring();
  });

  // Reports
  byId("printReportButton")?.addEventListener("click", () => window.print());

  // Logout
  byId("logoutButton")?.addEventListener("click", async () => {
    try {
      await request("/api/auth/logout", { method: "POST" });
    } catch (error) {
      console.error("Logout error:", error);
    }

    window.location.replace("/login.html");
  });

  // Initial dashboard
  showSection("overview");
  await loadRisks();
});
