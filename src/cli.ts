const spawn = require('child_process').spawn;
const JSONStream = require('JSONStream');

let itemByTitle : {[title:string]:BandEntry} = {};

import Dmenu from './dmenu';

const fuzzy = require('fuzzy.js');

type ButtonData = { label:string, value:string }
type ButtonMap = { [id: number]: ButtonData }
type ButtonCallback = (b:ButtonData)=>void;

interface Field {
  name: string;
  value: string;
  designation: string;
};

interface BandEntry {
  overview: {
    title: string;
    URLs: string[];
    tags: string[];
    url: string;
    ainfo: string;
    ps: number;
  }
  data: {
    fields: Field[]
    backupKeys: string[];
    passwordHistory: {
      value: string;
      time: number;
    }[];
    sections: {
      title: string;
      name: string;
      fields: any[];
    }[];
  }
}


let binPath = __dirname+"/../opvault_reader"


async function main() {
  let dmenu = new Dmenu<BandEntry>();
  //dmenu.add(JSON.stringify(process.argv), null)
  let xtitle = await getXtitle();

  const vault = spawn(binPath)
  let matches = [];
  vault.stdout.setEncoding('utf-8');
  vault.stderr.setEncoding('utf-8');
  vault.stderr.pipe(process.stderr);
  vault.stdout
    .pipe(JSONStream.parse())
    .on('data', (data:BandEntry)=> {
      let regexp = new RegExp(data.overview.title, 'i');
      if (xtitle.match(regexp)) {
        dmenu.addFirst(data.overview.title, data)
      } else if (data.data.fields) {
        let match = fuzzy(xtitle, data.overview.title)
        match.data = data;
        matches.push(match);
      } else {
        // ignore these for now, they are not logins
      }
    })
    .on('end', ()=>{
      matches.sort((a,b)=>a.score < b.score ? 1 : -1).forEach((match)=>{
        dmenu.add(match.query, match.data);
      });
      // dmenu.addFirst( rebuild opvault db )
      dmenu.done()
    })

  dmenu.setCallback((title, item)=>{
    let overview = item.overview;
    let data = item.data
    let buttons : ButtonMap = {};
    let usernameBtn : ButtonData = null;
    let passwordBtn : ButtonData = null;

    data.fields.filter(f=>f.designation).map((f,i)=>{
      let btn = {label: f.designation, value: f.value};
      buttons[i] = btn;
      if (btn.label === "username") {
        usernameBtn = btn;
      }
      if (btn.label === "password") {
        passwordBtn = btn;
      }
    })

    selectWithDmenu(buttons, (dmenu) => {
      if (usernameBtn && passwordBtn) {
        dmenu.addFirst("autologin", {
          label: 'autologin',
          value: usernameBtn.value+"\t"+passwordBtn.value+"\n"
        });
      }
    }, (btn)=>{
      if (btn.label === "autologin") {
        typeWithXdotool([btn.value]);
      } else {
        let dmenu = new Dmenu<any>();
        dmenu.add("type", null)
        dmenu.add("copy", null);
        dmenu.done();
        dmenu.setCallback((sel)=>{
          switch (sel) {
            case "copy": return saveToClipboard(btn.value);
            case "type": return typeWithXdotool([btn.value]);
          }
        });
      }
    });
  });
}

function saveToClipboard(str: string) {
  let xclip = spawn('/usr/bin/xclip')
  xclip.stdin.setEncoding('utf-8');
  xclip.stdin.write(str)
  xclip.stdin.end();
  xclip.on('exit', ()=>{
    process.exit(0);
  });
}

async function getXtitle() : Promise<string> {
  return new Promise<string>((resolve, reject) => {
    let xtitle = spawn('/usr/bin/xtitle', []);
    let out = "";
    xtitle.stdout.on('data', (data)=> out+=data.toString() );
    xtitle.on('exit', ()=> resolve(out) );
  });
}

async function typeOnKeyboardSync(str) {
  return new Promise((resolve, reject) => {
    let xdotool = spawn('/usr/bin/xdotool', [
      'type', 
      '--delay', '100',
      str
    ]);
    xdotool.on('exit', ()=>{
      resolve();
    });
  });
}

async function typeWithXdotool(strings:string[]) {
  for (let i=0;i<strings.length;i++) {
    await typeOnKeyboardSync(strings[i]);
  }
  process.exit(0);
}

function selectWithDmenu(
  buttons: ButtonMap,
  beforeDone: (dmenu:Dmenu<ButtonData>)=>void,
  callback:ButtonCallback,
):
void {
  let dmenu = new Dmenu<ButtonData>();
  for (let id in buttons) {
    let btn = buttons[id]
    dmenu.add(btn.label, btn);
  }
  beforeDone(dmenu);
  dmenu.done();
  dmenu.setCallback((title, btn)=> callback(btn))
}

main();
