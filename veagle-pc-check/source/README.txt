VEAGLE PC CHECK  v0.8.0
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
  Even the optional monthly check (see the Tools tab) only exists if you copy its command and run it.
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

COMFORT
-------
Top right of the report: the sun button switches to a light theme, "Aa" makes everything bigger. Both are
remembered on your PC. In every problem you can tick each step when you have done it, and the Summary
page counts your progress (this only marks your progress, nothing is run).

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
            many PCs in one table, an optional monthly check (you decide), Windows secrets, explained words.
AI help     ask an AI (Claude first) to explain things to you. Personal data is removed.
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
Open the "AI help" tab. The app prepares a text with your scan. Your user name, PC name,
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
