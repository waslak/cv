   function generateStaticJson() {
            const currentDate = new Date();
            const day = String(currentDate.getDate()).padStart(2, '0');
            const month = String(currentDate.getMonth() + 1).padStart(2, '0'); // Months are zero-based
            const year = currentDate.getFullYear();
            const hours = String(currentDate.getHours()).padStart(2, '0');
            const minutes = String(currentDate.getMinutes()).padStart(2, '0');

            // Format transactionDate as dd/MM/yyyy HH:mm
            const transactionDate = `${day}/${month}/${year} ${hours}:${minutes}`;
          

            // Generate random 7-character number based on ddmmyy
            const randomId = `${day}${month}${year}` + Math.floor(Math.random() * 1000).toString().padStart(3, '0');

            // Static JSON object
            const staticJson = {
                "PriorRequest": {
                    "Header": {
                        "SenderID": "TestRiayatiF01",
                        "ReceiverID": "TestRiayatiT01",
                        "TransactionDate": transactionDate,
                        "RecordCount": 1,
                        "DispositionFlag": "TEST",
                        "PayerID": "TestRiayatiH01"
                    },
                    "Authorization": {
                        "Type": "Eligibility",
                        "ID": `eRxprovtest01_${randomId}_01`,
                        "RequestType": "New",
                        "Gender": "Male",
                        "RequestReferenceNumber": "",
                        "MemberID": "AqTestmbr1",
                        "Limit": 120,
                        "EmiratesIDNumber": "111-1111-1111111-1",
                        "DateOrdered": transactionDate,
                        "DateOfBirth": "01/01/2021 00:00",
                        "Encounter": {
                            "FacilityID": "TestRiayatiF01",
                            "Type": 1
                        }
                    }
                }
            };

            return JSON.stringify(staticJson, null, 2);
        }

        document.getElementById('generateJsonButton').addEventListener('click', function () {
            const jsonOutput = generateStaticJson();
            document.getElementById('jsonOutput').value = jsonOutput;
        });

        document.getElementById('jsonForm').addEventListener('submit', async function (event) {
            event.preventDefault();

            const jsonOutput = document.getElementById('jsonOutput').value;
            const responseElement = document.getElementById('response');

            if (!jsonOutput) {
                responseElement.textContent = 'Please generate the JSON first.';
                return;
            }

            try {
                const headers = new Headers();
                headers.append('username', 'TestRiayatiF01');
                headers.append('password', 'c238200d-35f2-46ed-80a5-5b9d123849dd');
                headers.append('Content-Type', 'application/json');

                const response = await fetch('https://tmbapi.riayati.ae:8083/api/Authorization/PostRequest', {
                    method: 'POST',
                    headers: headers,
                    body: jsonOutput
                });

                const responseData = await response.json();
                responseElement.textContent = JSON.stringify(responseData, null, 2);
            } catch (error) {
                responseElement.textContent = `Error: ${error.message}`;
            }
        });

        document.getElementById('goBackButton').addEventListener('click', function () {
        
        window.location.href = 'index.html'; // Replace 'index.html' with your desired page
    });
