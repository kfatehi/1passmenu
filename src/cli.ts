const spawn = require('child_process').spawn;
const JSONStream = require('JSONStream');

let itemByTitle : {[title:string]:BandEntry} = {};

import Dmenu from './dmenu';

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

let dmenu = new Dmenu<BandEntry>();

let binPath = __dirname+"/../opvault_reader"

const vault = spawn(binPath)
vault.stdout.setEncoding('utf-8');
vault.stderr.setEncoding('utf-8');
vault.stderr.pipe(process.stderr);
vault.stdout
  .pipe(JSONStream.parse())
  .on('data', (data:BandEntry)=> {
    if (data.data.fields) {
      dmenu.add(data.overview.title, data)
    } else {
      // ignore these for now, they are not logins
    }
  })
  .on('end', ()=>dmenu.done())

type ButtonData = { label:string, value:string }
type ButtonMap = { [id: number]: ButtonData }
type ButtonCallback = (b:ButtonData)=>void;

dmenu.setCallback((title, item)=>{
  let overview = item.overview;
  let data = item.data
  let buttons : ButtonMap = {};

  data.fields.filter(f=>f.designation).map((f,i)=>{
    buttons[i+10] = {label: f.designation, value: f.value};
  })

  selectWithDmenu(buttons, (btn)=>{
    let dmenu = new Dmenu<any>();
    dmenu.add("type", null)
    dmenu.add("copy", null);
    dmenu.done();
    dmenu.setCallback((sel)=>{
      switch (sel) {
        case "copy": return saveToClipboard(btn);
        case "type": return typeWithXdotool(btn);
      }
    });
  });
});

function saveToClipboard(btn: ButtonData) {
  let xclip = spawn('/usr/bin/xclip')
  xclip.stdin.setEncoding('utf-8');
  xclip.stdin.write(btn.value)
  xclip.stdin.end();
  xclip.on('exit', ()=>{
    process.exit(0);
  });
}

function typeWithXdotool(btn: ButtonData) {
  let xdotool = spawn('/usr/bin/xdotool', [
    'type', 
    '--delay', '100',
    btn.value
  ]);
  xdotool.on('exit', ()=>{
    process.exit(0);
  });
}

function selectWithDmenu(buttons: ButtonMap, callback:ButtonCallback) : void {
  let dmenu = new Dmenu<ButtonData>();
  for (let id in buttons) {
    let btn = buttons[id]
    dmenu.add(btn.label, btn);
  }
  dmenu.done();
  dmenu.setCallback((title, btn)=> callback(btn))
}

function selectWithYad(title:string, buttons: ButtonMap, callback:ButtonCallback) : void {
  let yadOpts = [
    `--image=dialog-password`,
    `--title=${title}`,
    `--text=Click a field from ${title} to copy to your pasteboard:`,
    ...Object.keys(buttons).map((k)=>
      `--button=${buttons[k].label}:${k}`
    ),
    `--button=Close:1`
  ];
  let yad = spawn('/usr/bin/yad', yadOpts);
  yad.on('exit', (exitStatus)=>{
    let index = exitStatus;
    let btn = buttons[index];
    if (btn) {
      callback(btn);
    } else {
      process.exit(0);
    }
  });
}
