const cp = require('child_process');
const fs = require('fs');
const path = require('path');

function exec(cmd) {
    try {
        return cp.execSync(cmd, { encoding: 'utf-8' }).trim();
    } catch (e) {
        console.error(`Error executing: ${cmd}`);
        if (e.stderr) console.error(e.stderr);
        return null;
    }
}

// The original commits from the original main (we might need to find where they are now since we force-pushed)
// Actually, 'origin/main' might still have the old ones if we can find them, or we can use the reflog.
// For now, let's assume we can get them from the reflog or we just use the current main and clean it.
// The user says it's a mess, so current main has the commits but with bad files.

const commits = exec('git rev-list --reverse main').split('\n').filter(Boolean);
console.log(`Found ${commits.length} commits in history.`);

// Backup current state just in case
exec('git branch -f backup-before-v2');

// Prepare clean-main-v2
try { exec('git branch -D clean-main-v2'); } catch (e) { }
exec('git checkout --orphan clean-main-v2');
exec('git reset --hard');

commits.forEach(hash => {
    console.log(`Processing ${hash}...`);

    // 1. Get the files from the commit
    exec(`git checkout ${hash} -- .`);

    // 2. FORCE DELETE unwanted files/folders
    const toDelete = ['.env', 'node_modules', 'scrub_script.js', 'run_scrub.sh', 'reconstruct_history.js', 'reconstruct_history.js', 'temp_msg.txt', 'test_token.txt', 'run_scrub.sh', 'scrub_script.js'];

    toDelete.forEach(p => {
        const fullPath = path.join(process.cwd(), p);
        if (fs.existsSync(fullPath)) {
            if (fs.lstatSync(fullPath).isDirectory()) {
                fs.rmSync(fullPath, { recursive: true, force: true });
            } else {
                fs.unlinkSync(fullPath);
            }
            console.log(`  Deleted ${p}`);
        }
    });

    // 3. Scrub secrets from allowed files
    const filesToScrub = ['server.js', 'package.json', 'README.md', 'package-lock.json'];
    const token = '774028910:AAFE1VrZObZV1ucmwuhXWyFcRFnJSmI58uU';
    filesToScrub.forEach(f => {
        if (fs.existsSync(f)) {
            let content = fs.readFileSync(f, 'utf8');
            const scrubbed = content.replace(new RegExp(token, 'g'), 'YOUR_TOKEN');
            if (content !== scrubbed) {
                fs.writeFileSync(f, scrubbed);
                console.log(`  Scrubbed ${f}`);
            }
        }
    });

    // 4. Commit with original metadata
    const msg = exec(`git log -1 --format=%B ${hash}`);
    fs.writeFileSync('temp_msg_v2.txt', msg);

    // We must ensure we don't 'git add .' if there are node_modules around
    exec(`git add -A`); // Adds everything currently in the tree

    // Double check node_modules is not staged
    exec(`git rm -r --cached node_modules --ignore-unmatch`);
    exec(`git rm --cached .env --ignore-unmatch`);

    const authorName = exec(`git log -1 --format=%an ${hash}`);
    const authorEmail = exec(`git log -1 --format=%ae ${hash}`);
    const date = exec(`git log -1 --format=%ad ${hash}`);

    process.env.GIT_AUTHOR_NAME = authorName;
    process.env.GIT_AUTHOR_EMAIL = authorEmail;
    process.env.GIT_AUTHOR_DATE = date;
    process.env.GIT_COMMITTER_NAME = authorName;
    process.env.GIT_COMMITTER_EMAIL = authorEmail;
    process.env.GIT_COMMITTER_DATE = date;

    exec(`git commit -F temp_msg_v2.txt`);
});

console.log('Done! Clean history created in clean-main-v2.');
