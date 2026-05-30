import fs from 'fs';
fetch("http://localhost:3000/api/auth/login", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ email: "admin123@admin.com", password: "12345678910" })
}).then(r => r.json()).then(authData => {
  if (!authData.token) { console.error("No token"); return; }
  fetch("http://localhost:3000/api/library", {
    headers: { "Authorization": `Bearer ${authData.token}` }
  }).then(r => r.json()).then(items => {
    console.log(JSON.stringify(items, null, 2));
  });
});
