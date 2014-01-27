#!/bin/bash

echo "Compiling common models."
cd ../blender/v266
../../tools/obj2js.sh Board.obj Board.js
cp Board.js ../../../themes/draughts/.
cp Board.js ../../../themes/chess/.
rm Board.js
../../tools/obj2js.sh BoardCell.obj BoardCell.js
cp BoardCell.js ../../../themes/draughts/.
cp BoardCell.js ../../../themes/chess/.
rm BoardCell.js

echo "Compiling draughts models."
cd draughts
../../../tools/obj2js.sh Pawn.obj Pawn.js
../../../tools/obj2js.sh Queen.obj Queen.js
cp Pawn.js ../../../../themes/draughts/.
cp Queen.js ../../../../themes/draughts/.
rm Pawn.js Queen.js

echo "Compiling chess models."
cd ../chess
../../../tools/obj2js.sh Pawn.obj Pawn.js
../../../tools/obj2js.sh Queen.obj Queen.js
../../../tools/obj2js.sh King.obj King.js
../../../tools/obj2js.sh Rook.obj Rook.js
../../../tools/obj2js.sh Knight.obj Knight.js
../../../tools/obj2js.sh Bishop.obj Bishop.js
cp Pawn.js ../../../../themes/chess/.
cp Queen.js ../../../../themes/chess/.
cp King.js ../../../../themes/chess/.
cp Rook.js ../../../../themes/chess/.
cp Knight.js ../../../../themes/chess/.
cp Bishop.js ../../../../themes/chess/.
rm Pawn.js Queen.js King.js Rook.js Knight.js Bishop.js

