import fetch from 'node-fetch';
import dotenv from 'dotenv';

dotenv.config();

const baseApiUrl = process.env.MYPOLITICS_API_URL;
const projectListUrl = `${baseApiUrl}/api/v1/project`;
const projectUrl = (projectId) => `${baseApiUrl}/api/v1/project/${projectId}`;
const surveyStatsUrl = (surveyId) => `${baseApiUrl}/api/v1/survey/${surveyId}/stats`;


async function fetchFromApi(url) {
  const response = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      'User-Agent': 'DiscordBot/1.0',
      'Accept': 'application/json'
    }
  });

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  return response.json();
}

async function sendMessageToDiscord(content) {
  const response = await fetch(process.env.DISCORD_WEBHOOK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content })
  });

  if (!response.ok) {
    throw new Error(`Failed to send message to Discord: ${response.statusText}`);
  }

  return response.json();
}

async function main() {
  const shortProjectList = await fetchFromApi(projectListUrl);
  const projects = await Promise.all(shortProjectList.map(project => fetchFromApi(projectUrl(project.id))));
  for (const project of projects) {
    if (project.surveys.length === 0) { continue; }

    const lastSurveyId = project.surveys[project.surveys.length - 1].id;
    project.lastSurvey = await fetchFromApi(surveyStatsUrl(lastSurveyId));
  }


  let content = "";
  for (const project of projects) {
    content += `**${project.name}**\n`;
    if (project.lastSurvey) {
      content += `*Ostatnie 60m:* **${project.lastSurvey.last.hour}**\n`;
      content += `*Ostatnie 24h:* **${project.lastSurvey.last.day}**\n`;
    }
    content += `*Razem:* **${Intl.NumberFormat("pl").format(project.totalSolvedSurveys)}**\n`;

    content += '\n';
  }

  await sendMessageToDiscord(content);
  console.log("✅ Message sent!");
}

main().catch((err) => {
  console.error("❌ Error:", err);
  process.exit(1);
});