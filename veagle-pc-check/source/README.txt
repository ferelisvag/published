VEAGLE PC CHECK  v2.2.0
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
- The only things it asks the internet: which of your programs have updates (winget), one
  "ping" to your own router, and a few lookups of website names (www.microsoft.com, and in the
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
  Cockpit             - black and red, with a big radar of the 8 areas.
  Bento               - dark, with soft round cards.
  Cyber               - a turning sphere with one dot for every finding. Drag it, point at a dot, press it to open.
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
