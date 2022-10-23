WebGL 8x8 board games
=====================
Copyright © 2011-2022 Jordi Mariné Fort

About
-----

This is a web application for playing some 8x8 board games, against your computer or with a local/remote friend.
It only works in browsers with WebGL support, and implements the following games:
- [Draughts](http://en.wikipedia.org/wiki/Draughts#Long-range_kings.3B_men_cannot_capture_backwards_.28Spanish_draughts_family.29) (with the rules I used to play at school, that were similar to portuguese draughts)
- [American checkers](http://en.wikipedia.org/wiki/English_draughts)
- [Turkish draughts (aka Dama)](https://en.wikipedia.org/wiki/Turkish_draughts)
- [Chess](http://en.wikipedia.org/wiki/Chess) / [Chess960](http://en.wikipedia.org/wiki/Chess960)
- [Breakthrough game (8x8 variant)](http://en.wikipedia.org/wiki/Breakthrough_(board_game)) invented by Dan Troyka 


Click [HERE](http://usuaris.tinet.cat/jmarine/dames) to play the games.


Installation
------------

The application files should be deployed into a web server to work properly in some web browsers (although Firefox also works fine loading the game from local files).

This application also requires a [WGS server](https://github.com/jmarine/wgs) to support multi-player online games. To install a private WGS server, follow these [instructions](https://github.com/jmarine/wgs/wiki/Installation). After installation, you need to access [WGS's administration page](http://localhost:8080/admin.html), and create 6 applications with the names: **chess**, **chess960**, **checkers**, **draughts**, **dama** and **breakthrough**
(the other settings don't need to be changed).


License
-------

The source code of this game is licensed under [GNU GPL v3](https://raw.githubusercontent.com/jmarine/webgl8x8boardgames/master/LICENSE.txt) and uses the libraries:
- SpiderGL
- Sylvester
- jQuery
- L20n
- WGS
- CryptoJS
- Google Analytics

