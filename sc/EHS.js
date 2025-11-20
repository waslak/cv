// white space remover 
function cleanId(value) {
  if (!value) return "";
  return value.trim().replace(/\s+/g, ""); // remove ALL spaces
}


// Define EHS upload headers
const EHS_HEADERS = [
  "Clinician Unique ID","English Name","Arabic name","License","Active","License Start",
  "Clinician License End","Source","nationalId","Specialty Code","SubSpecialtyCode",
  "Location","Gender","nationality","email","phone","Display Name",
  "Facility License","Region"
];

document.getElementById("ehsHeaderRow").innerHTML =
  EHS_HEADERS.map(h => `<th>${h}</th>`).join("");

// Utility: format date yyyy-mm-dd
function formatDate(d) {
  if (!d) return "";
  const date = new Date(d);
  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const dd = String(date.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

// Calculate Clinician License End & Active
function updateCalculatedFields(row) {
  const dateStartInput = row.querySelector(".dateStart");
  const licenseEndCell = row.querySelector(".licenseEnd");
  const activeCell = row.querySelector(".active");

  const dateStartVal = dateStartInput.value;
  if (dateStartVal) {
    const startDate = new Date(dateStartVal);
    const endDate = new Date(startDate);
    endDate.setFullYear(startDate.getFullYear() + 1);
    endDate.setDate(endDate.getDate() - 1);
    licenseEndCell.textContent = formatDate(endDate);
    activeCell.textContent = "True";
  } else {
    licenseEndCell.textContent = "";
    activeCell.textContent = "";
  }
}

// Attach event listeners
document.querySelectorAll(".dateStart").forEach(input => {
  input.addEventListener("change", e => {
    const row = e.target.closest("tr");
    updateCalculatedFields(row);
  });
});

// ➕ Add Row
document.getElementById("addRowBtn").addEventListener("click", () => {
  const newRow = document.querySelector("#dataBody tr").cloneNode(true);
  newRow.querySelectorAll("input").forEach(i => i.value = "");
  newRow.querySelector(".licenseEnd").textContent = "";
  newRow.querySelector(".active").textContent = "";
  newRow.querySelector(".dateStart").addEventListener("change", e => {
    const row = e.target.closest("tr");
    updateCalculatedFields(row);
  });
  document.getElementById("dataBody").appendChild(newRow);
});

// 🧹 Clear Table
document.getElementById("clearBtn").addEventListener("click", () => {
  document.getElementById("dataBody").innerHTML = `
    <tr>
      <td><input type="text" class="clinicianId"></td>
      <td><input type="text" class="englishName"></td>
      <td><input type="text" class="arabicName"></td>
      <td><input type="text" class="specialty"></td>
      <td><input type="date" class="dateStart"></td>
      <td class="licenseEnd"></td>
      <td class="active"></td>
      <td><input type="text" class="facility"></td>
    </tr>
  `;
  document.querySelector(".dateStart").addEventListener("change", e => {
    const row = e.target.closest("tr");
    updateCalculatedFields(row);
  });
});

// 🏢 Load Facility Data
// You can edit this list to your facility codes
const staticFacilityData = `7371, 7351, 7403, 7323, 7373, 7383, 7372, 7392, 7362, 7397, 7354, 7467, 7436, 7413, 7821, 7353, 7499, 7525, 7500, 7395, 7478, 7396, 7443, 7444, 7410, 7376, 7348, 7364, 7456, 7531, 7673, 7437, 7426, 7439, 7514, 7366, 7347, 7406, 7335, 7420, 7393, 7394, 7349, 7374, 7675, 7465, 7457, 7435, 7449, 7434, 7440, 7433, 7384, 7334, 7346, 7375, 7327, 7332, 7336, 7333, 7379, 7377, 7345, 7409, 7454, 7428, 7342, 60638, 7452, 7481, 7445, 7385, 7404, 7405, 7417, 7479, 7448, 7418, 7442, EHS, 7378, 7425, 7401, 7399, 7367, 7451`;

document.getElementById("loadFacilityBtn").addEventListener("click", () => {
  const rows = document.querySelectorAll("#dataBody tr");
  rows.forEach(row => {
    const facilityInput = row.querySelector(".facility");
    facilityInput.value = staticFacilityData;
  });
  alert("Facility column updated with static multiple facility records.");
});

// 🔄 Generate EHS Upload Preview
document.getElementById("generateBtn").addEventListener("click", () => {
  const rows = document.querySelectorAll("#dataBody tr");
  const ehsBody = document.getElementById("ehsBody");
  ehsBody.innerHTML = "";

  rows.forEach(row => {
    const clinicianId = row.querySelector(".clinicianId").value.trim();
    const englishName = row.querySelector(".englishName").value.trim();
    const arabicName = row.querySelector(".arabicName").value.trim();
    const specialty = row.querySelector(".specialty").value.trim();
    const dateStart = row.querySelector(".dateStart").value;
    const licenseEnd = row.querySelector(".licenseEnd").textContent.trim();
    const active = row.querySelector(".active").textContent.trim();
    const facility = row.querySelector(".facility").value.trim();

    if (!clinicianId || !englishName) return;

    const rowData = {
      "Clinician Unique ID": clinicianId,
      "English Name": englishName,
      "Arabic name": arabicName || "",
      "License": "",
      "Active": active,
      "License Start": formatDate(dateStart),
      "Clinician License End": licenseEnd,
      "Source": "MoHAP",
      "nationalId": "",
      "Specialty Code": specialty || "",
      "SubSpecialtyCode": "",
      "Location": "",
      "Gender": "",
      "nationality": "",
      "email": "",
      "phone": "",
      "Display Name": englishName,
      "Facility License": facility || "",
      "Region": "UAE"
    };

    const tr = document.createElement("tr");
    EHS_HEADERS.forEach(h => {
      const td = document.createElement("td");
      td.textContent = rowData[h] ?? "";
      tr.appendChild(td);
    });
    ehsBody.appendChild(tr);
  });
});

// ⬇️ Download Excel
document.getElementById("downloadBtn").addEventListener("click", () => {
  const wb = XLSX.utils.book_new();
  const rows = [];

  const ehsBody = document.querySelectorAll("#ehsBody tr");
  ehsBody.forEach(tr => {
    const obj = {};
    tr.querySelectorAll("td").forEach((td, i) => {
      obj[EHS_HEADERS[i]] = td.textContent;
    });
    rows.push(obj);
  });

  const ws = XLSX.utils.json_to_sheet(rows, { header: EHS_HEADERS });
  XLSX.utils.book_append_sheet(wb, ws, "EHS Upload");
  XLSX.writeFile(wb, "EHS_Upload.xlsx");
});

/* for specialty dropdown*/

// Sample list (edit as needed)
let SPECIALTY_LIST = [];

fetch("./specialty.json")
  .then(res => res.json())
  .then(data => {
    SPECIALTY_LIST = data;

    // attach autocomplete AFTER JSON is loaded
    document.querySelectorAll(".specialty").forEach(input =>
      attachSpecialtyAutocomplete(input)
    );
  });

// attach autocomplete to all specialty inputs
function attachSpecialtyAutocomplete(input) {
  input.addEventListener("input", function () {
    let val = this.value;
    closeAllLists();

    if (!val) return;

    const listDiv = document.createElement("div");
    listDiv.setAttribute("class", "autocomplete-items");
    this.parentNode.appendChild(listDiv);

    SPECIALTY_LIST.forEach(item => {
      if (item.name.toLowerCase().includes(val.toLowerCase())) {
        const option = document.createElement("div");
        option.setAttribute("class", "autocomplete-item");
        option.innerHTML = `${item.name} (${item.code})`;
        option.addEventListener("click", () => {
          input.value = item.code; // load integer code
          closeAllLists();
        });
        listDiv.appendChild(option);
      }
    });
  });

  input.addEventListener("blur", function () {
    setTimeout(closeAllLists, 200);
  });
}

function closeAllLists() {
  document.querySelectorAll(".autocomplete-items").forEach(el => el.remove());
}

/* -------------------------------------------
   CLEAR PREVIEW BUTTON
--------------------------------------------*/

document.getElementById("clearPreviewBtn").addEventListener("click", () => {
  document.getElementById("ehsBody").innerHTML = "";
  alert("Preview table cleared.");
});


    


