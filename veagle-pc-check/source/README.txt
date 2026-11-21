VEAGLE PC CHECK  v3.3.6
=======================
VEAGLE - ferelis.gr

WHAT IS THIS?
-------------
A free program that looks at your Windows PC and tells you, in plain words, if something is
wrong and exactly how to fix it. Think of it as a check-up at the doctor.
You do not need to know anything about computers.

IT IS SAFE
----------
- It only LOOKS. It does not change, install or delete anything on your PC.
- It does not send your files, passwords or personal data anywhere. The report stays on your PC.
- The only things it asks the internet: which of your programs have updates (winget), 5 small
  "pings" to your own router, and a few lookups of website names (www.microsoft.com, and in the
  full scan a speed comparison of DNS servers: yours, Cloudflare, Google and Quad9).
- The 10-second performance snapshot and the list of network neighbours only read what the PC already knows.
  Nothing on your network is scanned. If the NVIDIA driver installed nvidia-smi, it is asked for temperature and load.
- The serial number of the PC is read only for your own inventory file. It is never in the AI
  package or in the share-safe copy.
- NOTHING IS EVER CHANGED OR TURNED ON FOR YOU. Every fix is something you do yourself, step by step.
  Even the optional scheduled check (see the Tools tab: you pick how often, which day and which time) only exists if you copy its command and run it. The optional message that asks whether to open the report only asks.
- You can read every line of the program: app\collector.ps1 opens in Notepad.

HOW TO USE IT (5 steps, about 5 minutes)
----------------------------------------
1. Find the ZIP file you downloaded (usually in the Downloads folder).
   Right-click it, click "Properties". If you see a box that says "Unblock", tick it and click OK.
2. Right-click the ZIP again and choose "Extract All...". Click "Extract".
   IMPORTANT: do not run the program from inside the ZIP. Always extract first.
3. Open the new folder and double-click  VEAGLE-PC-Check.bat
   (Short on time? Double-click VEAGLE-PC-Check-Quick.bat instead. It takes about 30 seconds.)
4. Windows asks: "Do you want to allow this app to make changes?" Click YES.
   (It needs this only to READ things like drive health. It still changes nothing.)
5. A black window shows the progress. Do not close it. After about 3 to 8 minutes your
   browser opens with the report. That is all.

If a blue window says "Windows protected your PC": click "More info", then "Run anyway".
That message appears for every new program. The file is plain text and you can read it first.

READING THE REPORT
------------------
- Look at the big number (health score) and the box called "Do this first".
- Click "Show me how, step by step" on a problem. Each problem has:
    IN PLAIN WORDS   what it means, without technical talk
    time, difficulty and risk   how long it takes and whether you can break anything
    numbered steps   exactly what to click or type
- Words with a dotted underline show an explanation when you hold the mouse over them.
- You never have to fix everything. Start with the red HIGH ones, one at a time.
  After each fix, restart the PC and scan again. The "Compare" tab shows what got better.
- The "Tools" tab has a beginner guide, a message you can send to a helper, and more.

NEW IN 2.5.2
- The new look (first called Fable52) is now named "Veagle OS" and is the look the report opens with. The earlier dark look is now called "Classic". You can change the look at any time in the "Theme" box at the top. From 2.5.3 the choice lasts only while the report is open: the next time, the report opens with Veagle OS again.

NEW IN 3.3.6
- The report has fewer looks: Cockpit, Bento, Cyber, IQON and Compass were removed. The looks that stay are Veagle OS, Classic, Clean and Step by step.

NEW IN 3.3.5
- The scan window now draws the Veagle eagle in 26 lines, one more line with every step, so the eagle is complete when the scan ends. The window is a little wider and taller for this.
- The check of where the disk space went (the longest one) is now the last step, so the first 25 steps finish quickly.

NEW IN 3.3.4
- The scan window: long step names no longer wrap onto the next line, and the time now sits before the step name.

NEW IN 3.3.3
- The scan window looks better: a cleaner header (FULL or QUICK, read-only, administrator or not), and every step shows its number, the percent, a progress bar and the time since the start. The finished box shows how long it took.
- The start files go straight to the Windows question again (no extra key press). At the end a short "what next" screen tells you where the report is.

NEW IN 3.3.1
- No internet? The check now notices it by itself (it only reads Windows network settings, it sends nothing) and runs without the winget and DNS checks, which is also faster. The report says so. You can force this with the option -NoNetwork when you run collector.ps1 yourself.
- Windows cannot always read the install date of one update; this is harmless and no longer shows up as a scan note.
- The folder now has only two start files again: VEAGLE-PC-Check.bat and VEAGLE-PC-Check-Quick.bat.

NEW IN 3.3.0
- New box in the Help & AI tab: "How to open a ticket with your technician", step by step, with a ready text you can copy (no name, no serial numbers, no Wi-Fi, no accounts).

NEW IN 3.2.2
- A scan with no internet traffic at all (called the no-internet scan; since 3.3.1 it starts by itself when there is no network) (no winget, no DNS lookups). Only the 5 pings to your own router remain. The report says which checks were skipped.
- The temperature box now says clearly that it shows a motherboard thermal zone, not the processor.
- After the scan the data file is read back to check that it is valid, and the nesting depth was raised so deep data is never turned into text.

NEW IN 3.2.1
- New box on the Insights page: "Care plan: what to do and when". Weekly, monthly and yearly habits for a healthy PC, with numbers from your own scan (free space, programs waiting for updates), and a short list of when to ask a technician.
- The finding about programs needing updates is now "high" only when a remote-access program (AnyDesk, RustDesk...) is a whole version behind. One small patch behind is "medium".
- Programs you downloaded from the author's own sites (ferelis.gr, ferelisvag.github.io) are no longer listed as "downloaded without a valid signature".
- The scan now reads Firefox's profiles.ini to find the profile you really use, and skips one useless query when no graphics card is found.

NEW IN 3.2.0
- A new, fairer score. Each area (Stability, Storage, Security...) is scored on its own and the overall score is a weighted average that is pulled a little towards the worst area. The Insights page shows exactly how many points each finding costs. The number can look different from the previous version for the same PC. This is normal, the formula changed, not your PC, so do not compare it with old scans.
- Hardware errors (WHEA) that could not be corrected, and several different blue screen codes in a row, now count as evidence of hardware or memory instability.
- The 5 most useful actions are now ranked by how much each one raises the score, divided by the time and risk it needs. Actions that need a backup first say so.
- Two small fixes in the scan: the SSD wear number in the history file was always empty (now read from the right place), and the temporary security-policy file is always deleted, even if the scan is stopped.
- Nothing new is collected and nothing is changed or sent anywhere.

NEW IN 3.1.0
- The report is now a troubleshooting assistant. On the Summary page you get a plain summary and the likely causes, each with the evidence and a confidence level (High, Medium, Low). It is an estimate from rules, never a certain diagnosis.
- Why the score is what it is: every point has a reason. The Insights page also has a gaming readiness score, a memory stability check, driver age and risk, a security risk list, update health, blue screen codes explained and Improving / Stable / Degrading labels for every measure.
- The Summary page now ends with the 5 most useful actions.
- Nothing new is collected and nothing is changed or sent anywhere. No cloud AI is used.

NEW IN 3.0.0
- Privacy page: a "Check your accounts" part with two links (your Microsoft devices, and a data-leak check). They open only when you click.
- The size of the hibernation file is now read correctly.
- The "Traces" part explains that most items are normal everyday activity.
- Together with 2.7 and 2.8: active start-up programs, other start-up places, disk mapping, browser privacy, VirusTotal links, winget script, games on slow disks, screen refresh rate.

ΣΤΑ ΕΛΛΗΝΙΚΑ (συντομία)
1. Κατέβασε το ZIP, κάνε δεξί κλικ και «Εξαγωγή όλων». Μην το τρέξεις μέσα από το ZIP.
2. Διπλό κλικ στο VEAGLE-PC-Check.bat (πλήρης σάρωση) ή στο VEAGLE-PC-Check-Quick.bat (γρήγορη, χωρίς τα αργά μέρη).
3. Όταν τελειώσει, ανοίγει η αναφορά. Η εφαρμογή δεν αλλάζει τίποτα στον υπολογιστή και δεν στέλνει τίποτα πουθενά. Η αναφορά έχει κουμπί ΕΛ/EN πάνω δεξιά.

NEW IN 2.8.1
- Start-up programs: a new part shows where programs start from besides Task Manager: Windows services and scheduled tasks that run at sign-in (non-Microsoft only), with how to stop each one.
- A start-up item that belongs to a service account is shown as "unknown" instead of "allowed, not running".

NEW IN 2.8.0
- Games: the scan finds where Steam and Epic games are installed. If they are on a slow hard disk while the PC has an SSD, the report says so and explains how to move them (nothing is moved for you).
- Screen: if the screen runs at a lower refresh rate than the graphics card reports, the report tells you where to change it. Information only.
- Explanations for two more Event Viewer messages (Intel network link drops, Hyper-V HyperThreading warning).
- The scan now has 26 steps. The new step has not been tried on every Windows version yet.

NEW IN 2.7.0
- Start-up programs: every program registered to start with Windows is listed, and the ones that are really active (running now) are marked. Others are shown as "allowed, not running" or "switched off in Windows".
- The drive errors are matched to the disk they came from, so a virtual or USB disk is no longer mistaken for a failing internal drive. Network ports: who holds the most connections.
- Privacy page: your browsers (Chrome, Edge, Brave, Firefox: only on/off switches), which programs talk to the internet and who made them, saved Wi-Fi networks.
- Unsigned downloads get a button that opens VirusTotal (only when you click; the fingerprint of the file is asked, the file is not uploaded).
- Tools: a script to update your programs with winget. Every line starts switched off.
- Checks at a glance: Windows protection (core isolation, Defender extras), gaming settings, Desktop and Downloads size.
- The scan now has 25 steps. These new checks have not been tried on every Windows version yet.

NEW IN 2.6.1
- Fix: a Microsoft account is no longer reported as "allowed to have no password" (it signs in with your Microsoft password or PIN). App names on the Privacy page are shorter and clearer.

NEW IN 2.6.0
- A new "Privacy" page (and a ninth area, Privacy, in the charts). It shows, in plain words: what Windows shares with Microsoft, which ads and tips are switched on, which programs may use your camera, microphone, location, contacts and files (and when they last did), what your PC remembers about you, and who can sign in to it. Every row says where to click if you want to change it. Nothing is changed for you.
- New read-only checks of Windows settings (power and screen, updates, sign-in, network, language), shown in the Equipment page and, where useful, as findings.
- The scan now has 23 steps. These new checks have not been tried on every Windows version yet: if something shows as "not checked", that is normal and harmless.

NEW IN 2.5.5
- The Veagle OS look of the report now has a glass and gloss finish: frosted-glass panels, a light edge on the top of cards, glossy buttons. Same colours and layout. Small spacing fixes (step numbers, area labels, the scan-checked bar). The scan itself is unchanged.

NEW IN 2.5.0
- The report has a new box, "What this scan checked". It lists the deeper checks that were done and the ones that could not be done (quick scan, or not run as administrator). A check that was not done is never shown as "all good".
- Every question to the Windows information service (WMI) now gives up after 90 seconds, so one stuck answer cannot hang the scan.
- (Changed in 2.5.4) The scan reads every warning and error of the period again, with no upper limit. On a PC with very many warnings this step can take longer.
- Three new read-only checks: a drive that Windows marked as "needs a check", how many days the Windows logs remember, and whether the Secure Boot certificates were renewed.
- The scan has 22 steps now. Everything is still read-only.

NEW IN 2.4.0
- A new report look called Fable52 (choose it in the "Theme" box at the top). It tells the story of your PC with a flower-shaped chart of the 9 areas, a heartbeat line of the last days and your next three moves. It has gentle motion; the "Pause motion" button stops it.
- Only the look changes. The scan, the findings and the score are the same, and the scan stays read-only.

NEW IN 2.3.0
- Two new report looks, chosen in the "Theme" box at the top: IQON and Compass. Compass is a new kind of Summary: you say how many minutes you have and it suggests what to fix first, with a map of your problems and a calendar of calm days. Both change every tab. The earlier looks are still there.
- Only the look and the Summary layout change. The scan, the findings and the score are the same, and the scan stays read-only.

NEW IN 2.2.0
- The Insights page shows the recent Windows Update history: the last 10 operations with date, update name, result and error code. Failed or cancelled ones are in red.
- The scan only reads the local Windows Update history. Nothing is downloaded, installed or changed.
- On a PC where Windows Update cannot be read, this part is simply left empty.

NEW IN 2.1.0
- The "AI help" tab is now "Help & AI". It has two parts: "Help from a person (IT)" and "Help from an AI" (the same as before).
- Send the report to your IT helper: fill a short form (what happens, since when, what you tried), tick the box, and the app makes one .zip file with the report and your answers. You attach it to an e-mail or a message. Nothing is sent by the app.
- If the person who gave you this tool filled in the file support.json (next to the .bat files), the e-mail address is already there.
- "What is wrong?": pick what bothers you (slow, hot, freezes, no internet...) and see only the findings that can be related.
- "Since when?": pick the date the problem started and see what changed on the PC in the 7 days before.
- "Can my helper connect?": checks if Quick Assist or another remote-help program is available, with step-by-step instructions.
- Devices: sound, microphone, camera, Bluetooth and printers, and which ones Windows reports as faulty.
- Who used the camera, microphone or location: the programs Windows remembers, and a finding for programs from unusual folders.
- The PDF for a customer shows the contact details from support.json.
- The scan has 21 steps now. Everything is still read-only.

NEW IN 2.0.0
- New look: the menu is now a vertical bar on the left, and on the Findings page a list of areas opens next to it. The "Menu" button at the top switches back to the old menu on top. On a phone and when printing the old menu is used automatically.
- "Traces": 21 new checks that look at what happened on this PC: failed and remote sign-ins, cleared Windows logs, new accounts, new services, programs that ran (Prefetch, BAM, ShimCache), downloads without a valid signature, Defender exclusions and detections, firewall rules, open network shares, hidden replacements of accessibility programs, start-up folders, suspicious PowerShell use, open Wi-Fi networks and risky listening ports. Everything is only read; nothing is changed. The Security log needs Administrator rights.
- New "Traces" section on the Insights page and a "Security traces" lane in the timeline.
- Private data from these checks (IP addresses, account names, file names, Wi-Fi names) is hidden in the Share-safe copy.
- The scan has 20 steps now.

NEW IN 1.2.0
- Windows 11 readiness with the exact reasons (TPM, Secure Boot, UEFI, memory, drive size). The processor list of Microsoft cannot be checked offline.
- Scheduled tasks and background services that start from unusual folders or with hidden commands (only reading, nothing is stopped).
- Result of the Windows memory test and of the last system file check (SFC), read from the logs. Nothing is run.
- Stuck print jobs, and old .NET and Java runtimes.
- The scan has 19 steps now.

NEW IN 1.1.0
- Scan notes: if a check could not read everything (for example it was not run as Administrator), the Summary says which step may be incomplete. This is not a problem with your PC.
- Findings: switch between "For you" (only what to do) and "For a technician" (all details).
- Print / PDF always makes the clean report sheet, in any theme. In the print window choose "Save as PDF".
- Links to the official support pages of your PC maker and graphics card, and a button that opens the download page so you can check for a newer version. The app never checks the internet by itself.

COMFORT AND LOOK
----------------
Top right of the report there is a box called "Theme". It changes only how the report looks, nothing on your
PC is touched, and the report remembers your choice in your browser. You can switch any time:
  Classic (Veagle OS) - the dark look from before. This one opens first.
  Clean               - light and simple, easy to read.
  Step by step        - big text, one finding at a time with Back and Next buttons. Good if you are new to this.
In the Classic theme the sun button switches to a light theme. "Aa" makes everything bigger in every theme. Both are remembered on your PC.
In every problem you can tick each step when you have done it, and the Summary page counts your progress
(this only marks your progress, nothing is run).

LANGUAGE
--------
The report starts in your browser's language (English or Greek). Use the button EN / ΕΛ at the
top right to switch. Greek Windows are supported.

TABS IN THE REPORT
------------------
Summary     one page: a health ring, a timeline of the last 30 days, your progress charts, what changed since your last scan, and the 3 things to do.
Dashboard   the score and the most important things, with all the details.
Findings    every problem, in plain words, with the fix.
Hardware / Software / Events   all the details, for people who want them.
Compare     compare with an older scan to see your progress.
Tools       beginner guide, summary for a helper, safe fix script (you tick what goes in), Excel/CSV export,
            many PCs in one table, an optional scheduled check (you decide), quick network repairs, system repair steps, an internet speed test link, Windows secrets, explained words.
Help & AI     ask an AI (Claude first) to explain things to you. Personal data is removed.
PC type     top right: Home, Work or Gaming. It changes which problems count more.
Since last scan   the report remembers your previous scan and shows what got better or worse.
Share-safe copy   saves the report without your name, PC name, IP and e-mail, so you can send it.

WHAT THE CHECK LOOKS AT
-----------------------
Hardware, drives and their health, where your disk space went, blue screens and crashes, Windows reliability score,
antivirus status and threats, firewall, risky settings (shared folders, open ports,
remote access), unwanted programs, Windows updates, programs that need updating, drivers and BIOS age,
internet and Wi-Fi quality, backups and System Restore, battery (laptops),
and whether the PC can run Windows 11 (with a step-by-step guide). The report also connects the dots between
Event Viewer events and problems: for example crashes that began right after an update or install, crashes
right after waking from sleep, or drive errors right before a crash.

WHERE ARE MY RESULTS?
---------------------
In the folder where you extracted the ZIP, inside "Reports", in a folder named with the date and time:
  report.html   the report (open it with any browser, it works without internet)
  data.json     the same information as data (used by the Compare tab)
  raw\          extra files (msinfo32, systeminfo, event logs, app list)
Delete the folder any time you like.

GETTING HELP FROM AN AI
-----------------------
Open the "Help & AI" tab. The app prepares a text with your scan. Your user name, PC name,
IP addresses and e-mail addresses are removed first, and you can read exactly what will be
copied. Click "Copy and open Claude", then press Ctrl + V in the Claude window and send.
Read the text before you paste it: program names and file paths can still say something about you.

IF SOMETHING GOES WRONG
-----------------------
- The black window closes immediately: right-click the .bat file and choose "Run as administrator".
- It says it cannot find app\collector.ps1: you did not extract the whole ZIP. Extract all, try again.
- Your antivirus complains: the .bat file only starts app\collector.ps1. Both are plain text. Allow them.
- A part of the report is empty: the "Events" tab has a "Scan notes" box at the bottom that
  says which check did not work. The most common reason is that you clicked "No" at the
  administrator question.
- The scan seems stuck: some checks take a few minutes. Wait up to 10 minutes. Do not switch the PC off.

GENERAL DISCLAIMER
------------------
VEAGLE PC Check is a free tool provided "as is", without any warranty. It only reads information and
shows explanations and estimates that can be incomplete or wrong. It is not a replacement for
professional advice, repair or security services. The authors are not responsible for any loss of
data, damage or other consequence of using the app or following its suggestions. Use any command
only if you understand it, and make a backup first. Product and company names belong to their owners.

Brand, idea and design: VEAGLE - https://ferelis.gr
Built with the help of Claude (Anthropic).
When you share the scan with an AI, the package says that the data comes from the VEAGLE PC Check app (ferelis.gr), built with the help of Claude.
