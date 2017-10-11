# 1passmenu

A dmenu-driven client for 1password -- inspired by [passmenu](https://github.com/cdown/passmenu)

Depends on:

* nodejs & npm
* custom binary that uses [libopvault](https://github.com/torshind/libopvault) (you will need to compile this yourself for now, see the code below)
* dmenu (for modally presenting you a list of choices)
* xdotool (for typing an item directly into a program)
* xclip (for loading an item into your clipboard/pasteboard)
* [optional] yad (not enabled by default, see the source code if you want to use that)

## compiling a libopvault binary

The program invokes a binary which will decode your opvault data into a specific JSON schema,
which is then parsed and loaded into dmenu. As such, you'll need to compile a program that
uses libopvault and outputs like so:

```c++
/*
libopvault

Licensed under the MIT License <http://opensource.org/licenses/MIT>.
Copyright (c) 2017 Marcello V. Mansueto

Permission is hereby  granted, free of charge, to any  person obtaining a copy
of this software and associated  documentation files (the "Software"), to deal
in the Software  without restriction, including without  limitation the rights
to  use, copy,  modify, merge,  publish, distribute,  sublicense, and/or  sell
copies  of  the Software,  and  to  permit persons  to  whom  the Software  is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE  IS PROVIDED "AS  IS", WITHOUT WARRANTY  OF ANY KIND,  EXPRESS OR
IMPLIED,  INCLUDING BUT  NOT  LIMITED TO  THE  WARRANTIES OF  MERCHANTABILITY,
FITNESS FOR  A PARTICULAR PURPOSE AND  NONINFRINGEMENT. IN NO EVENT  SHALL THE
AUTHORS  OR COPYRIGHT  HOLDERS  BE  LIABLE FOR  ANY  CLAIM,  DAMAGES OR  OTHER
LIABILITY, WHETHER IN AN ACTION OF  CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE  OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

#include <iostream>

#include "vault.h"
#include "profile.h"
#include "folder.h"
#include "band.h"

using namespace std;
using namespace OPVault;

int main(int argc, char *argv[])
{
    string master_password = u8"YOUR_MASTER_PASSWORD";
    string cloud_data_dir = "PATH_TO_YOUR_OPVAULT_DIR/default";
    string local_data_dir = "PATH_TO_DIR_WHERE_YOU_WANT_THE_SQLITE_DB_TO_LIVE";

    Vault vault(cloud_data_dir, local_data_dir, master_password);

    vector<BandEntry> items;
    vault.get_items(items);

    for(unordered_map<string,string>::const_iterator it1=CATEGORIES.begin(); it1!=CATEGORIES.end(); ++it1) {
        items.clear();
        vault.get_items_category(it1->first, items);
        for(vector<BandEntry>::iterator it2=items.begin(); it2!=items.end(); ++it2) {
            it2->decrypt_overview();
            it2->decrypt_data();
            cout << "{\"overview\":" << it2->decrypted_overview << ",\"data\":" << it2->decrypted_data << "}" << endl;
        }
    }

    return 0;
}
```

This binary is expected to live in the repo root as `opvault_reader`

## TODO

We don't want to put the password inside this binary. Find a solution to this that balances security and convenience.
