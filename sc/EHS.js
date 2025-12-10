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
const staticFacilityData = `7479;7478;7353;7375;7374;7377;7333;7332;7335;7481;7499;7452;7451;7454;7456;7376;7457;7379;7378;7371;7449;7334;7448;7336;7354;7351;7327;7349;7364;7342;7465;7373;7372;7346;7467;7385;7345;7348;7347;7366;7384;7383;7397;7396;7367;7399;7434;7393;7395;7392;7394;7433;7436;7435;7362;7426;7673;7440;7443;7675;7442;7445;7444;7437;7439;7323;7410;7413;7405;7404;7406;7409;7420;7425;7500;7418;7417;7821;7531;7525;7401;7403;7514;EHS;60638;7428`;

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
      "License": clinicianId,
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

fetch("./sc/specialty.json")
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
// Attach autocomplete on new row
document.getElementById("addRowBtn").addEventListener("click", () => {
  const rows = document.querySelectorAll("#dataBody tr");
  const lastRow = rows[rows.length - 1];
  attachSpecialtyAutocomplete(lastRow.querySelector(".specialty"));
});
/* -------------------------------------------
   CLEAR PREVIEW BUTTON
--------------------------------------------*/

document.getElementById("clearPreviewBtn").addEventListener("click", () => {
  document.getElementById("ehsBody").innerHTML = "";
  alert("Preview table cleared.");
});


    


