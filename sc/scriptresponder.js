/************************************
 *  GLOBAL VARIABLES + HELPERS
 ************************************/

function to3(num) {
  return Number(parseFloat(num || 0).toFixed(3));
}

let savedEntities = [];
let parsedViewData = {};

const authEndpointSelect = document.getElementById("api-endpoint");
const remitEndpointSelect = document.getElementById("api-endpoint-remit");
const idInputContainer = document.getElementById("id-input-container");
const dispositionContainer = document.getElementById("disposition-container");
const generateAuthBtn = document.getElementById("generate-auth-btn");
const generateRemitBtn = document.getElementById("generate-remit-btn");


/************************************
 *  MODE SWITCH (AUTH vs REMIT)
 ************************************/
function toggleMode() {
  const mode = document.querySelector('input[name="mode"]:checked').value;

  authEndpointSelect.disabled = mode === "remit";
  remitEndpointSelect.disabled = mode === "auth";

  toggleInputs();
  updateResponseTypeOptions();
}


/************************************
 *  SHOW/HIDE INPUTS
 ************************************/
function toggleInputs() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const endpoint =
    mode === "auth" ? authEndpointSelect.value : remitEndpointSelect.value;

  const showIdInput =
    endpoint.includes("View") || endpoint.includes("SetDownloaded");

  const showDisposition =
    endpoint.includes("PostAuthorization") ||
    endpoint.includes("PostRemittance");

  generateAuthBtn.classList.toggle("hidden", !endpoint.includes("PostAuthorization"));
  generateRemitBtn.classList.toggle("hidden", !endpoint.includes("PostRemittance"));

  idInputContainer.classList.toggle("hidden", !showIdInput);
  dispositionContainer.classList.toggle("hidden", !showDisposition);

  updateResponseTypeOptions();
}


/************************************
 *  CREDENTIAL FIX (IMPORTANT)
 ************************************/
function getHeaders() {
  const baseUrl = document.getElementById("base-url").value;
  const headers = { "Content-Type": "application/json" };

  // FIXED — use startsWith instead of includes
  if (baseUrl.startsWith("https://tmbapi.riayati.ae:8083")) {
    headers.username = "TestRiayatiT01";  // Production
    headers.password = "48436ab5-66b4-4386-b6e3-2825c8b2b684";
  } else {
    headers.username = "MohapTPA003";     // Onboarding
    headers.password = "9f3bfdd1-6de8-4e63-9f92-507f3045fb3b";
  }

  return headers;
}


/************************************
 *  SEND REQUEST (MANUAL)
 ************************************/
async function sendRequest() {
  const baseUrl = document.getElementById("base-url").value;
  const mode = document.querySelector('input[name="mode"]:checked').value;

  let endpoint =
    mode === "auth" ? authEndpointSelect.value : remitEndpointSelect.value;

  const manualId = document.getElementById("manual-id").value.trim();

  let method = "GET";
  if (endpoint.includes("Post") || endpoint.includes("SetDownloaded")) {
    method = "POST";
  }

  // append ID if needed
  if ((endpoint.includes("View") || endpoint.includes("SetDownloaded")) && manualId) {
    endpoint += manualId;
  }

  const disposition = document.getElementById("disposition").value;

  let requestData = null;
  if (endpoint.includes("PostAuthorization")) {
    requestData = buildPostAuthorizationBody(parsedViewData, disposition);
  } else if (endpoint.includes("PostRemittance")) {
    requestData = buildPostRemittanceBody(parsedViewData, disposition);
  }

  try {
    const response = await axios({
      method: method,
      url: baseUrl + endpoint,
      headers: getHeaders(),
      data: requestData,
    });

    document.getElementById("response").innerText = JSON.stringify(
      response.data,
      null,
      2
    );

    /*************** SAVE GETNEW ENTITIES ***************/
    if (endpoint.includes("GetNew")) {
      savedEntities = response.data.Entities || [];
      document.getElementById("saved-data").innerText =
        "Saved Entities:\n" + JSON.stringify(savedEntities, null, 2);
    }

    /*************** PARSE VIEW (AUTH) ***************/
    else if (endpoint.includes("View") && mode === "auth") {
      const entity = response.data.Entity;
      if (entity) {
        parsedViewData = {
          PAsenderID: entity.Header?.ReceiverID,
          PAreceiverID: entity.Header?.SenderID,
          PayerID: entity.Header?.PayerID,
          TransactionID: entity.Authorization?.ID,
          activities: entity.Authorization?.Activity || []
        };
      }
      document.getElementById("viewed-data").innerText =
        "Parsed View Data:\n" + JSON.stringify(parsedViewData, null, 2);
    }

    /*************** PARSE VIEW (REMIT) ***************/
    else if (endpoint.includes("View") && mode === "remit") {
      const entity = response.data.Entity;
      const claims = entity.Claim || [];

      parsedViewData = {
        RASender: entity.Header?.ReceiverID,
        RAReceiver: entity.Header?.SenderID,
        PayerID: entity.Header?.PayerID,
        MultipleClaim: claims.map(c => ({
          ClaimID: c.ID,
          ProviderID: c.ProviderID,
          FacilityID: c.Encounter?.FacilityID,
          Activities: c.Activity || []
        }))
      };

      document.getElementById("viewed-data").innerText =
        "Parsed Remittance View Data:\n" +
        JSON.stringify(parsedViewData, null, 2);
    }

    /*************** POST RESPONSES ***************/
    else if (
      endpoint.includes("PostAuthorization") ||
      endpoint.includes("PostRemittance")
    ) {
      document.getElementById("posted-data").innerText =
        JSON.stringify(response.data, null, 2);
    }
  } catch (error) {
    const errorText =
      error.response
        ? JSON.stringify(error.response.data, null, 2)
        : error.message;
    document.getElementById("response").innerText = "Error:\n" + errorText;
  }
}

/****************************************************
 * RESPONSE TYPE RULE (HIDE PRCE IN REMITTANCE MODE)
 ****************************************************/
function updateResponseTypeOptions() {
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const responseTypeSelect = document.getElementById("responsetype");

  // show all first
  Array.from(responseTypeSelect.options).forEach(o => (o.hidden = false));

  if (mode === "remit") {
    const prceOption = Array.from(responseTypeSelect.options).find(o => o.value === "PRCE");
    if (prceOption) prceOption.hidden = true;

    if (responseTypeSelect.value === "PRCE") {
      responseTypeSelect.value = "Full Payment";
    }
  }
}


/****************************************************
 * BUILD POST AUTHORIZATION BODY
 ****************************************************/
function buildPostAuthorizationBody(viewData, disposition) {
  const transactionDate = moment().format("DD/MM/YYYY HH:mm");
  const endDate = moment().add(45, "minutes").format("DD/MM/YYYY HH:mm");
  const idPayer = "Aq_" + moment().format("DDMMYYYYHHmmss");

  const responseType = document.getElementById("responsetype").value;
  const activities = viewData.activities || [];

  let processedActivities = [];
  let authDenialCode = "";

  switch (responseType) {
    case "Full Payment":
      processedActivities = activities.map(a => ({
        ...a,
        PaymentAmount: to3(a.Net),
        DenialCode: "",
        Comments: "Fully approved"
      }));
      break;

    case "Full Rejection":
      processedActivities = activities.map(a => ({
        ...a,
        PaymentAmount: 0,
        DenialCode: "AUTH-001",
        Comments: "Rejected"
      }));
      authDenialCode = "AUTH-001";
      break;

    case "Partial Payment":
      processedActivities = activities.map((a, idx) => {
        if (idx === 0) {
          return {
            ...a,
            PaymentAmount: 0,
            DenialCode: "NCOV-003",
            Comments: "Partial approval – patient share"
          };
        }
        return {
          ...a,
          PaymentAmount: to3(a.Net),
          DenialCode: "",
          Comments: "Partially approved"
        };
      });
      break;

    case "PRCE":
      processedActivities = activities.map(a => {
        const fivePercent = a.Net * 0.05;
        const pay = a.Net - fivePercent;
        return {
          ...a,
          PaymentAmount: to3(pay),
          DenialCode: pay < a.Net ? "PRCE-015" : "",
          Comments: "PRCE rule applied"
        };
      });
      break;
  }

  const result = responseType === "Full Rejection" ? "No" : "Yes";

  return {
    PriorAuthorization: {
      Header: {
        SenderID: viewData.PAsenderID,
        ReceiverID: viewData.PAreceiverID,
        TransactionDate: transactionDate,
        RecordCount: 1,
        DispositionFlag: disposition,
        PayerID: viewData.PayerID
      },
      Authorization: {
        Result: result,
        ID: viewData.TransactionID,
        IDPayer: idPayer,
        Start: transactionDate,
        End: endDate,
        DenialCode: authDenialCode,
        Comments: "Authorization response",
        Activity: processedActivities
      }
    }
  };
}


/****************************************************
 * BUILD POST REMITTANCE BODY
 ****************************************************/
function buildPostRemittanceBody(viewData, disposition) {
  const transactionDate = moment().format("DD/MM/YYYY HH:mm");
  const idPayerBase = "RA_" + moment().format("DDMMYYYYHHmmss");
  const responseType = document.getElementById("responsetype").value;

  const claims = (viewData.MultipleClaim || []).map((claim, claimIndex) => {
    const activities = claim.Activities || [];
    let processedActivities = [];

    /************** FULL PAYMENT **************/
    if (responseType === "Full Payment") {
      processedActivities = activities.map(a => {
        const gross = (a.Net || 0) + (a.PatientShare || 0);
        return {
          ...a,
          Gross: to3(gross),
          Net: to3(a.Net),
          PaymentAmount: to3(a.Net),
          DenialCode: "",
          Comment: "Fully paid",
          List: to3(gross)
        };
      });
    }

    /************** FULL REJECTION **************/
    else if (responseType === "Full Rejection") {
      processedActivities = activities.map(a => {
        const gross = (a.Net || 0) + (a.PatientShare || 0);
        return {
          ...a,
          Gross: to3(gross),
          Net: to3(a.Net),
          PaymentAmount: 0,
          DenialCode: "AUTH-001",
          Comment: "Rejected",
          List: to3(gross)
        };
      });
    }

    /************** PARTIAL PAYMENT **************/
    else if (responseType === "Partial Payment") {
      if (activities.length === 1) {
        alert("Partial payment is NOT allowed when claim has only 1 activity.");
      }

      processedActivities = activities.map((a, idx) => {
        const gross = (a.Net || 0) + (a.PatientShare || 0);

        if (idx === 0) {
          return {
            ...a,
            Gross: to3(gross),
            PaymentAmount: to3(a.Net),
            DenialCode: "",
            Comment: "Partially paid",
            List: to3(gross)
          };
        }

        return {
          ...a,
          Gross: to3(gross),
          Net: to3(a.Net),
          PaymentAmount: 0,
          DenialCode: "AUTH-001",
          Comment: "Rejected in partial",
          List: to3(gross)
        };
      });
    }

    /************** CLAIM-LEVEL DENIAL **************/
    let claimDenialCode = "";
    const totalNet = activities.reduce((t, a) => t + (a.Net || 0), 0);
    const totalPaid = processedActivities.reduce((t, a) => t + (a.PaymentAmount || 0), 0);

    if (totalPaid < totalNet) {
      claimDenialCode = "AUTH-001";
    }

    return {
      ID: claim.ClaimID,
      IDPayer: `${idPayerBase}_${claimIndex}`,
      ProviderID: claim.ProviderID,
      PaymentReference: `${idPayerBase}_${claimIndex}`,
      DateSettlement: transactionDate,
      DenialCode: claimDenialCode,
      Encounter: { FacilityID: claim.FacilityID },
      Activity: processedActivities
    };
  });

  return {
    Remittance: {
      Header: {
        SenderID: viewData.RASender,
        ReceiverID: viewData.RAReceiver,
        TransactionDate: transactionDate,
        RecordCount: claims.length,
        DispositionFlag: disposition,
        PayerID: viewData.PayerID
      },
      Claim: claims
    }
  };
}


/****************************************************
 * Manual Generate Buttons
 ****************************************************/
function generateAuthBody() {
  const disposition = document.getElementById("disposition").value;
  const body = buildPostAuthorizationBody(parsedViewData, disposition);
  document.getElementById("posted-data").innerText =
    "Generated PostAuthorization Body:\n" +
    JSON.stringify(body, null, 2);
}

function generateRemitBody() {
  const disposition = document.getElementById("disposition").value;
  const body = buildPostRemittanceBody(parsedViewData, disposition);
  document.getElementById("posted-data").innerText =
    "Generated PostRemittance Body:\n" +
    JSON.stringify(body, null, 2);
}

/****************************************************
 Auto responder 
 ****************************************************/

 function log(msg) {
    const box = document.getElementById("response");
    box.innerText += "\n" + msg;
}

// ===========================
// GENERIC CALL
// ===========================
async function autoCall(endpoint, method = "GET", body = null) {
    try {
        const baseUrl = document.getElementById("base-url").value;

        const response = await axios({
            method,
            url: baseUrl + endpoint,
            headers: getHeaders(),
            data: body
        });

        return response.data;

    } catch (e) {
        log("❌ ERROR: " + 
            (e.response?.data ? JSON.stringify(e.response.data) : e.message)
        );
        return null;
    }
}

// ===========================
// MAIN AUTO CYCLE
// ===========================
async function autoCycle() {

    const mode = document.querySelector('input[name="mode"]:checked').value;
    const responseType = document.getElementById("responsetype").value;
    const disposition = document.getElementById("disposition").value;

    const fullAuto = confirm("Run full automatic cycle?\nPress Cancel for Review Mode.");
    const reviewMode = !fullAuto;

    log("mode: " + mode);
    log("[1] Auto Cycle Started");
    log("Response Type: " + responseType);
     log("Disposition: " + disposition);
   
  if (mode === "auth" ) {
    // -------------------------------------------
    // 1. AUTHORIZATION GET NEW
    // -------------------------------------------
    log("[2] Fetching Authorization GetNew...");
    const authNew = await autoCall("/api/Authorization/GetNew");
    
    if (!authNew?.Entities?.length) {
        log("❌ No authorization entity returned.");
        return;
    }

    const authId = authNew.Entities[0].ID;
    log("✔ Authorization ID: " + authId);

    // -------------------------------------------
    // 2. AUTHORIZATION VIEW
    // -------------------------------------------
    log("[3] Viewing Authorization...");
    const authView = await autoCall("/api/Authorization/View?id=" + authId);

    if (!authView?.Entity) {
        log("❌ Authorization view failed.");
        return;
    }

    parsedViewData = {
        PAsenderID: authView.Entity.Header?.ReceiverID,
        PAreceiverID: authView.Entity.Header?.SenderID,
        PayerID: authView.Entity.Header?.PayerID,
        TransactionID: authView.Entity.Authorization?.ID,
        activities: authView.Entity.Authorization?.Activity || []
    };

    log("✔ Authorization Parsed");
    // -------------------------------------------
    // 3. POST AUTHORIZATION
    // -------------------------------------------
    const authBody = buildPostAuthorizationBody(parsedViewData, disposition);

    if (reviewMode && !confirm("Upload Authorization JSON?"))
        return;

    log("[4] Uploading Authorization Response...");
    await autoCall("/api/Authorization/PostAuthorization", "POST", authBody);
    

    // -------------------------------------------
    // 4. SETDOWNLOADED AUTH
    // -------------------------------------------
    if(disposition === "PRODUCTION"){
          log("[5] Marking Authorization as Downloaded...");
        await autoCall("/api/Authorization/SetDownloaded?id=" + authId, "POST");

    }
    else {
       log("[5] Prior request not set as downloaded for disposition TEST...\n    To change disposition select PostAuthorization and change the flag and ran the service again");
         }
    }

  else {

   // ===========================================
    // REMITTANCE CYCLE
    // ===========================================
    log("==========================================");
    log("Starting Remittance Cycle");


    // -------------------------------------------
    // 5. REMITTANCE GET NEW
    // -------------------------------------------
    log("[6] Fetching Remittance GetNew...");
    const remitNew = await autoCall("/api/Claim/GetNew");

    if (!remitNew?.Entities?.length) {
        log("❌ No remittance entity returned.");
        return;
    }

    const remitId = remitNew.Entities[0].ID;
    log("✔ Remittance ID: " + remitId);


    // -------------------------------------------
    // 6. REMITTANCE VIEW
    // -------------------------------------------
    log("[7] Viewing Remittance...");
    const remitView = await autoCall("/api/Claim/View?id=" + remitId);

    parsedViewData = {
        RASender: remitView.Entity.Header?.ReceiverID,
        RAReceiver: remitView.Entity.Header?.SenderID,
        PayerID: remitView.Entity.Header?.PayerID,
        MultipleClaim: (remitView.Entity.Claim || []).map(c => ({
            ClaimID: c.ID,
            ProviderID: c.ProviderID,
            FacilityID: c.Encounter?.FacilityID || null,
            Activities: c.Activity || []
        }))
    };

    log("✔ Remittance Parsed");


    // -------------------------------------------
    // 7. POST REMITTANCE
    // -------------------------------------------
    const remitBody = buildPostRemittanceBody(parsedViewData, disposition);

    if (reviewMode && !confirm("Upload Remittance JSON?"))
        return;

    log("[8] Uploading Remittance Response...");
    await autoCall("/api/Claim/PostRemittance", "POST", remitBody);


    // -------------------------------------------
    // 8. SETDOWNLOADED REMITTANCE
    // -------------------------------------------
    if(disposition=== "PRODUCTION"){
    log("[9] Marking Claim as Downloaded...");
    await autoCall("/api/Claim/SetDownloaded?id=" + remitId, "POST");
    } else {
    log("[9] Claim not mark as Downloaded for Disposition TEST...\n    To change disposition select PostRemittance and change the flag and ran the service again...");
    }
    // -------------------------------------------
    // DONE
    // -------------------------------------------
    log("==========================================");
    log("AUTO CYCLE COMPLETE ✔");
}
  
}


// ===========================
// BIND BUTTON
// ===========================
document.getElementById("auto-cycle-btn").onclick = autoCycle;


//==========================
//Clear response history
//==========================

document.getElementById("clearPreviewBtn").addEventListener("click", () => {
  document.getElementById("response").innerHTML = "";
  alert("Response history will be cleared.");
});


