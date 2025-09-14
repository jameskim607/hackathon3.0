async function handleLogin(event) {
  event.preventDefault();

  const email = document.getElementById("loginEmail").value;
  const password = document.getElementById("loginPassword").value;

  try {
    const response = await fetch("http://127.0.0.1:8000/users/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password })
    });

    if (!response.ok) throw new Error("Login failed");

    const data = await response.json();
    console.log("Login success:", data);

    // Save token in localStorage
    localStorage.setItem("access_token", data.access_token);

    alert("Login successful!");
  } catch (err) {
    console.error(err);
    alert("Invalid credentials!");
  }
}

async function getProtectedData() {
  const token = localStorage.getItem("access_token");
  if (!token) {
    alert("Not logged in");
    return;
  }

  try {
    const response = await fetch("http://127.0.0.1:8000/protected", {
      headers: {
        "Authorization": "Bearer " + token
      }
    });

    if (!response.ok) throw new Error("Unauthorized");

    const data = await response.json();
    console.log(data);
    alert(data.message);
  } catch (err) {
    console.error(err);
    alert("Access denied!");
  }
}
