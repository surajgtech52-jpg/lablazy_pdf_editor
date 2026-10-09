const GOOGLE_APPS_SCRIPT_URL =
  "https://script.google.com/macros/s/" +
  "AKfycbx2hOBzHbF5LWk1-xeMOKKP4H5XLDjlqdcY3jbsU0SMk_SLDsJsTrN_E9fpN1cBXKg/exec";

const VALID_PRIORITIES = new Set(["Low", "Normal", "High", "Urgent"]);

export async function onRequestPost({ request }) {
  let payload;

  try {
    payload = await request.json();
  } catch {
    return Response.json({ error: "Request body must be valid JSON." }, { status: 400 });
  }

  const email = String(payload?.email || "").trim();
  const priority = String(payload?.priority || "").trim();
  const description = String(payload?.description || "").trim();

  if (!email || !email.includes("@")) {
    return Response.json({ error: "Please provide a valid email address." }, { status: 400 });
  }
  if (!VALID_PRIORITIES.has(priority)) {
    return Response.json({ error: "Please choose a valid priority." }, { status: 400 });
  }
  if (!description || description.length > 2000) {
    return Response.json(
      { error: "Description must contain 1 to 2000 characters." },
      { status: 400 }
    );
  }

  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, priority, description }),
    });

    if (!response.ok) {
      console.error("Google Apps Script returned", response.status);
      return Response.json(
        { error: "The report could not be saved. Please try again." },
        { status: 502 }
      );
    }
  } catch (error) {
    console.error("Could not send feedback to Google Apps Script", error);
    return Response.json(
      { error: "The report could not be saved. Please try again." },
      { status: 502 }
    );
  }

  return Response.json({ message: "Feedback saved." }, { status: 201 });
}
