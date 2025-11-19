  document.getElementById('apiForm').addEventListener('submit', async function(event) {
            event.preventDefault();

            // Get form values
            const reference = document.getElementById('reference').value;
            const patientIdentity = document.getElementById('patientIdentity').value;
            const memberID = document.getElementById('memberID').value;

            // Prepare headers
            const headers = new Headers();
            headers.append('username', 'TestRiayatiF01');
            headers.append('password', 'c238200d-35f2-46ed-80a5-5b9d123849dd');

            // Prepare query parameters
            const params = new URLSearchParams({ reference });
            if (patientIdentity) params.append('patientIdentity', patientIdentity);
                
            if (memberID) params.append('memberID', memberID);

            try {
                const response = await fetch(`https://tmbapi.riayati.ae:8083/api/ERX/ViewPharmacyPrescription?${params.toString()}`, {
                    method: 'GET',
                    headers: headers
                });

                const responseData = await response.json();
                document.getElementById('response').textContent = JSON.stringify(responseData, null, 2);
            } catch (error) {
                document.getElementById('response').textContent = 'Error: ' + error.message;
            }
        });

            
    // Add event listeners for dynamic disabling
    const referenceField = document.getElementById('reference');
    const patientIdentityField = document.getElementById('patientIdentity');
    const memberIDField = document.getElementById('memberID');

    function toggleDisableFields() {
      
        if (patientIdentityField.value){
            memberIDField.disabled = true;
        } else if (memberIDField.value){
         patientIdentityField.disabled = true;
        } else {
            patientIdentityField.disabled = false;
            memberIDField.disabled = false
        }       
    }

    // Attach change event listeners
  
    patientIdentityField.addEventListener('input', toggleDisableFields);
    memberIDField.addEventListener('input', toggleDisableFields);

    document.getElementById('clearButton').addEventListener('click', function () {
        // Clear all inputs
        referenceField.value = '';
        patientIdentityField.value = '';
        memberIDField.value = '';

        // Re-enable all fields
        referenceField.disabled = false;
        patientIdentityField.disabled = false;
        memberIDField.disabled = false;

        // Clear response
        document.getElementById('response').textContent = '';
    });

    document.getElementById('goBackButton').addEventListener('click', function () {
    
        window.location.href = 'index.html'; // Replace 'index.html' with your desired page
    });
