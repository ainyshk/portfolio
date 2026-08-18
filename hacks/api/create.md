---
layout: post
title: API create
permalink: /api/create
show_reading_time: false
---

<h3>Add a New User to InfoDB</h3>
<form id="addUserForm">
  <label for="firstName">First Name:</label>
  <input type="text" id="firstName" name="firstName" required><br>
  <label for="lastName">Last Name:</label>
  <input type="text" id="lastName" name="lastName" required><br>
  <label for="residence">Residence:</label>
  <input type="text" id="residence" name="residence" required><br>
  <button type="submit">Add User</button>
</form>
<div id="addUserResult"></div>

<script>
document.getElementById('addUserForm').addEventListener('submit', async function(event) {
  event.preventDefault();
  const firstName = document.getElementById('firstName').value;
  const lastName = document.getElementById('lastName').value;
  const residence = document.getElementById('residence').value;
  const data = {
    FirstName: firstName,
    LastName: lastName,
    Residence: residence
  };
  try {
    const response = await fetch('http://localhost:5001/api/data', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    const result = await response.json();
    if (response.ok) {
      document.getElementById('addUserResult').innerHTML = '<span style="color:green">User added!</span>';
      document.getElementById('addUserForm').reset();
    } else {
      document.getElementById('addUserResult').innerHTML = '<span style="color:red">' + (result.error || 'Error adding user') + '</span>';
    }
  } catch (err) {
    document.getElementById('addUserResult').innerHTML = '<span style="color:red">Network error</span>';
  }
});
</script>