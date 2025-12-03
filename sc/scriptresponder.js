function to3(num) {
    return Number(parseFloat(num || 0).toFixed(3));
}

 // --- Global variables to store state between API calls ---
      let savedEntities = []; // Stores entities from the GetNew call
      let parsedViewData = {}; // Stores cleaned-up data from the View call for use in POST requests
      const authEndpointSelect = document.getElementById("api-endpoint");
      const remitEndpointSelect = document.getElementById("api-endpoint-remit");
      const idInputContainer = document.getElementById("id-input-container");
      const dispositionContainer = document.getElementById(
        "disposition-container"
      );
      const generateAuthBtn = document.getElementById("generate-auth-btn");
      const generateRemitBtn = document.getElementById("generate-remit-btn");

      /*** Toggles between 'Authorization' and 'Remittance' modes.* Disables the dropdown menu that is not currently active. */

      function toggleMode() {
        const mode = document.querySelector('input[name="mode"]:checked').value;
        authEndpointSelect.disabled = mode === "remit";
        remitEndpointSelect.disabled = mode === "auth";
        toggleInputs(); // Update conditional inputs when mode changes
        updateResponseTypeOptions();   // response type selector
      }

      /**
       * Shows or hides the Transaction ID and DispositionFlag inputs
       * based on the selected API endpoint.
       */
      function toggleInputs() {
        const mode = document.querySelector('input[name="mode"]:checked').value;
        const endpoint =
          mode === "auth"
            ? authEndpointSelect.value
            : remitEndpointSelect.value;

        const showIdInput =
          endpoint.includes("View") || endpoint.includes("SetDownloaded");

        const showDisposition =
          endpoint.includes("PostAuthorization") ||
          endpoint.includes("PostRemittance");

        // show/hide generate buttons
        generateAuthBtn.classList.toggle(
          "hidden",
          !endpoint.includes("PostAuthorization")
        );
        generateRemitBtn.classList.toggle(
          "hidden",
          !endpoint.includes("PostRemittance")
        );

        idInputContainer.classList.toggle("hidden", !showIdInput);
        dispositionContainer.classList.toggle("hidden", !showDisposition);

        updateResponseTypeOptions();
      }

      function generateRemitBody() {
        const disposition = document.getElementById("disposition").value;
        const body = buildPostRemittanceBody(parsedViewData, disposition);
        document.getElementById("posted-data").innerText =
          "Generated PostRemittance Body:\n" + JSON.stringify(body, null, 2);
      }

 /*      function buildPostAuthorizationBody(viewData, disposition) {
        const transactionDate = moment().format("DD/MM/YYYY HH:mm");
        const endDate = moment().add(45, "minutes").format("DD/MM/YYYY HH:mm");
        const idPayer = "Aq_" + moment().format("DDMMYYYYHHmmss");

        const processedActivities = (viewData.activities || []).map(
          (activity, index) => {
            const newActivity = {
              ...activity,
              PaymentAmount: activity.Net,
              DenialCode: "",
              Comments: "Authorization Cycle Test",
            };
            if (index % 2 === 0) newActivity.DenialCode = "AUTH-001";
            return newActivity;
          }
        );

        return {
          PriorAuthorization: {
            Header: {
              SenderID: viewData.PAsenderID,
              ReceiverID: viewData.PAreceiverID,
              TransactionDate: transactionDate,
              RecordCount: 1,
              DispositionFlag: disposition,
              PayerID: viewData.PayerID,
            },
            Authorization: {
              Result: "Yes",
              ID: viewData.TransactionID,
              IDPayer: idPayer,
              Start: transactionDate,
              End: endDate,
              Comments: "Full approve",
              Activity: processedActivities,
            },
          },
        };
      } */

      function buildPostAuthorizationBody(viewData, disposition) {
    const transactionDate = moment().format("DD/MM/YYYY HH:mm");
    const endDate = moment().add(45, "minutes").format("DD/MM/YYYY HH:mm");
    const idPayer = "Aq_" + moment().format("DDMMYYYYHHmmss");

    const responseType = document.getElementById("responsetype").value;

    const activities = viewData.activities || [];

    let processedActivities = [];
    let authDenialCode = ""; // NEW – keeper for Authorization-level DenialCode

    switch (responseType) {
        case "Full Payment":
            processedActivities = activities.map(a => ({
                ...a,
                PaymentAmount: a.Net,
                DenialCode: "",
                Comments: "Full approved"
            }));
            break;

        case "Full Rejection":
            processedActivities = activities.map(a => ({
                ...a,
                PaymentAmount: 0,
                DenialCode: "AUTH-001",
                Comments: "Rejected"
            }));
            authDenialCode = "AUTH-001";   // <-- NEW (Authorization-level)
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
                const pay = a.Net-fivePercent; // default payer pays full

                return {
                    ...a,
                    PaymentAmount: to3(pay),
                    DenialCode: pay < a.Net ? "PRCE-015" : "",
                    Comments: "PRCE rule applied"
                };
            });
            break;

        default:
            console.warn("Unknown response type:", responseType);
            processedActivities = activities;
    }

    const result = (responseType === "Full Rejection") ? "No" : "Yes";

    return {
        PriorAuthorization: {
            Header: {
                SenderID: viewData.PAsenderID,
                ReceiverID: viewData.PAreceiverID,
                TransactionDate: transactionDate,
                RecordCount: 1,
                DispositionFlag: disposition,
                PayerID: viewData.PayerID,
            },
            Authorization: {
                Result: result,
                ID: viewData.TransactionID,
                IDPayer: idPayer,
                Start: transactionDate,
                End: endDate,
                DenialCode: authDenialCode,      // <-- NEW (only filled for rejection)
                Comments: "Authorization testing response",
                Activity: processedActivities,
            },
        },
    };
}


      function generateAuthBody() {
        const disposition = document.getElementById("disposition").value;
        const body = buildPostAuthorizationBody(parsedViewData, disposition);
        document.getElementById("posted-data").innerText =
          "Generated PostAuthorization Body:\n" + JSON.stringify(body, null, 2);
      }

        // old buildPostRemittanceBody
 /*      function buildPostRemittanceBody(viewData, disposition) {
        const transactionDate = moment().format("DD/MM/YYYY HH:mm");
        const idPayerBase = "RA_" + moment().format("DDMMYYYYHHmmss");

        const claims = (viewData.MultipleClaim || []).map(
          (claim, claimIndex) => {
            const processedActivities = (claim.Activities || []).map(
              (activity, actIndex) => {
                const act = {
                  ...activity,
                  Gross: activity.Net,
                  PaymentAmount: activity.Net,
                  DenialCode: "",
                  Comment: "This is a TEST",
                };
                if (actIndex < 2) {
                  act.PaymentAmount = 0;
                  act.DenialCode = "AUTH-001";
                  act.Comment = "Pre Approval required";
                }
                return act;
              }
            );
            return {
              ID: claim.ClaimID,
              IDPayer: `${idPayerBase}_${claimIndex}`,
              ProviderID: claim.ProviderID,
              PaymentReference: `${idPayerBase}_${claimIndex}`,
              DateSettlement: transactionDate,
              DenialCode: "",
              Encounter: { FacilityID: claim.FacilityID },
              Activity: processedActivities,
            };
          }
        );

        return {
          Remittance: {
            Header: {
              SenderID: viewData.RASender,
              ReceiverID: viewData.RAReceiver,
              TransactionDate: transactionDate,
              RecordCount: claims.length,
              DispositionFlag: disposition,
              PayerID: viewData.PayerID,
            },
            Claim: claims,
          },
        };
      }
 */
     

//response type update for both RA and PA
function updateResponseTypeOptions(){
  const mode = document.querySelector('input[name="mode"]:checked').value;
  const responseTypeSelect = document.getElementById("responsetype");
  
  //enable all option first
  Array.from(responseTypeSelect.options).forEach(opt => (opt.hidden = false));
    
  if (mode==="remit"){
    //hide PRCE when in remittance mode
    const prceOption = Array.from(responseTypeSelect.options).find(o => o.value==="PRCE");

    if (prceOption) prceOption.hidden = true;
      // in response type PRCE is select this will switch the type to Full payment
    if(responseTypeSelect.value === "PRCE"){
      responseTypeSelect.value = "Full Payment"
    }
  }
}

// updated buildPostRemittanceBody with response type selection

function buildPostRemittanceBody(viewData, disposition) {
    const transactionDate = moment().format("DD/MM/YYYY HH:mm");
    const idPayerBase = "RA_" + moment().format("DDMMYYYYHHmmss");
    const responseType = document.getElementById("responsetype").value;

    const claims = (viewData.MultipleClaim || []).map((claim, claimIndex) => {
        const activities = claim.Activities || [];

        let processedActivities = [];

        // -----------------------------
        // FULL PAYMENT LOGIC
        // -----------------------------
        if (responseType === "Full Payment") {
            processedActivities = activities.map(a => {
                const gross = (a.Net || 0) + (a.PatientShare || 0);
                return {
                    ...a,
                    Gross: to3(gross),
                    Net:to3(a.Net),
                    PaymentAmount: to3(a.Net),
                    DenialCode: "",
                    Comment: "Fully paid",
                     List: to3(gross)
                };
            });
        }

        // -----------------------------
        // FULL REJECTION LOGIC
        // -----------------------------
        else if (responseType === "Full Rejection") {
            processedActivities = activities.map(a => {
                const gross = (a.Net || 0) + (a.PatientShare || 0);
                return {
                    ...a,
                          Gross: to3(gross),
                    PaymentAmount: 0,
                    Net: to3(a.Net),
                    DenialCode: "AUTH-001",
                    Comment: "Rejected",
                      List: to3(gross)
                };
            });
        }

        // -----------------------------
        // PARTIAL PAYMENT LOGIC
        // -----------------------------
        else if (responseType === "Partial Payment") {
            // If only 1 activity → partial not allowed
            if (activities.length === 1) {
                alert("Partial payment is NOT allowed when claim has only 1 activity.");
            }

            processedActivities = activities.map((a, idx) => {
                const gross = (a.Net || 0) + (a.PatientShare || 0);

                // FIRST ACTIVITY = PAID
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

                // OTHER ACTIVITIES = REJECTED
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

        // -----------------------------
        // CLAIM-LEVEL LOGIC
        // -----------------------------
        let claimDenial = "";
        const totalNet = activities.reduce((t, a) => t + (a.Net || 0), 0);
        const totalPaid = processedActivities.reduce((t, a) => t + (a.PaymentAmount || 0), 0);

        if (totalPaid < totalNet) {
            claimDenial = "AUTH-001"; // remittance-level denial rule
        }

        return {
            ID: claim.ClaimID,
            IDPayer: `${idPayerBase}_${claimIndex}`,
            ProviderID: claim.ProviderID,
            PaymentReference: `${idPayerBase}_${claimIndex}`,
            DateSettlement: transactionDate,
            DenialCode: claimDenial,
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



 async function sendRequest() {
        const baseUrl = document.getElementById("base-url").value;
        const mode = document.querySelector('input[name="mode"]:checked').value;
        let endpoint =
          mode === "auth"
            ? authEndpointSelect.value
            : remitEndpointSelect.value;
        const manualId = document.getElementById("manual-id").value.trim();
     //   const method = endpoint.includes("Post") ? "POST" : "GET";
        let method = "GET";

        if (endpoint.includes("Post") || endpoint.includes("SetDownloaded") ){method ="POST"}
          
        

        if (
          (endpoint.includes("View") || endpoint.includes("SetDownloaded")) &&
          manualId
        )
          endpoint += manualId;

        const headers = { "Content-Type": "application/json" };
        if (baseUrl.includes("https://tmbapi.riayati.ae:8083")) {
          headers["username"] = "TestRiayatiT01";
          headers["password"] = "48436ab5-66b4-4386-b6e3-2825c8b2b684";
        } else {
          headers["username"] = "MohapTPA003";
          headers["password"] = "9f3bfdd1-6de8-4e63-9f92-507f3045fb3b";
        }

        let requestData = null;
        const disposition = document.getElementById("disposition").value;
        if (endpoint.includes("PostAuthorization"))
          requestData = buildPostAuthorizationBody(parsedViewData, disposition);
        else if (endpoint.includes("PostRemittance"))
          requestData = buildPostRemittanceBody(parsedViewData, disposition);

        try {
          const response = await axios({
            method: method,
            url: baseUrl + endpoint,
            headers: headers,
            data: requestData,
          });
          document.getElementById("response").innerText = JSON.stringify(
            response.data,
            null,
            2
          );

          if (endpoint.includes("GetNew")) {
            savedEntities = response.data.Entities || [];
            document.getElementById("saved-data").innerText =
              "Saved Entities:\n" + JSON.stringify(savedEntities, null, 2);
          } else if (endpoint.includes("View") && mode === "remit") {
            try {
              const jsonbody = response.data;
              const RAHeader = jsonbody.Entity.Header;
              const RAClaims = jsonbody.Entity.Claim || [];

              parsedViewData = {
                RASender: RAHeader.ReceiverID,
                RAReceiver: RAHeader.SenderID,
                PayerID: RAHeader.PayerID,
                MultipleClaim: RAClaims.map((claim) => ({
                  ClaimID: claim.ID,
                  ProviderID: claim.ProviderID,
                  FacilityID: claim.Encounter?.FacilityID || null,
                  Activities: claim.Activity || [],
                })),
                ClaimCount: RAClaims.length,
              };
              console.log("Parsed Remittance View Data:", parsedViewData);
              document.getElementById("viewed-data").innerText =
                "Parsed Remittance View Data:\n" +
                JSON.stringify(parsedViewData, null, 2);
            } catch (e) {
              console.error("Error parsing Remittance View:", e);
              document.getElementById("viewed-data").innerText =
                "Error parsing Remittance View response";
            }
          } else if (endpoint.includes("View") && mode === "auth") {
            const viewedEntity = response.data.Entity || null;
            if (viewedEntity) {
              parsedViewData = {
                PAsenderID: viewedEntity.Header?.ReceiverID || "",
                PAreceiverID: viewedEntity.Header?.SenderID || "",
                PayerID: viewedEntity.Header?.PayerID || "",
                TransactionID:
                  viewedEntity.Authorization?.ID || viewedEntity.Claim?.ID,
                activities:
                  viewedEntity.Authorization?.Activity ||
                  viewedEntity.Claim?.Activity ||
                  [],
              };
              document.getElementById("viewed-data").innerText =
                "Parsed View Data:\n" + JSON.stringify(parsedViewData, null, 2);
            } else
              document.getElementById("viewed-data").innerText =
                "No entity found in View response.";
          } else if (
            endpoint.includes("PostAuthorization") ||
            endpoint.includes("PostRemittance")
          )
            document.getElementById("posted-data").innerText = JSON.stringify(
              response.data,
              null,
              2
            );
        } catch (error) {
          const errorText = error.response
            ? JSON.stringify(error.response.data, null, 2)
            : error.message || JSON.stringify(error, null, 2);
          document.getElementById("response").innerText =
            "Error:\n" + errorText;
        }
      }
