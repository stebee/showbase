var mongoose = require('mongoose'),
    Schema = mongoose.Schema;

var _schema = null;

var _threeWay = {type: String, default: 'No', enum: ['No', 'Optional', 'Required']};

exports.registerSchema = function(meta)
{
    if (!meta)
        meta = {};

    if (!_schema)
    {
        _schema = new Schema({
            team: {
                name: {type: String, index: true},
                description: String,
                primaryContact: {
                    name: String,
                    email: String,
                    phone: String
                },
                technicalContact: {
                    name: String,
                    email: String,
                    phone: String
                },
                hasURM: Boolean,
                hasWoman: Boolean,
                hasDisabled: Boolean,
                hasLGBT: Boolean,
                twitter: String,
                facebook: String,
                website: String,
                roster: [
                    { name: String, role: String }
                ]
            },

            galleryState: {type: String, default: 'Unknown', enum: ['Unknown', 'Uploaded', 'Approved', 'Other' ], index: true},
            galleryURL: String,
            gallerySize: Number,

            authSlug: {type: String, index: {unique: true}},

            title: {type: String, index: {unique: true}},
            nature: String,
            genre: String,
            duration: String,
            players: String,
            languages: [String],
            description: String,
            vision: String,
            installationInstructions: String,
            gameplayInstructions: String,
            story: String,
            isDone: {type: Boolean, default: false},
            knownBugs: String,
            submissions: [
                {
                    venue: String,
                    date: Date
                }
            ],
            keywords: [String],
            hardwareRequirements: [String],
            softwareRequirements: [String],
            inputDevices: [String],
            distributionPlatforms: [String],
            screenshotURL: [String],
            videoURL: String,

            screenshotRequirementAcknowledged: Boolean,

            state: {type: String, index: true},
            createdAt: {type: Date, default: Date.now},
            lastEditedAt: {type: Date, default: Date.now}
        });
    }

    meta.Competitor = _schema;

    return meta;
}

exports.model = mongoose.model('Competitor', _schema);


/**


 Game type
 (“Downloadable PC Game” should be checked by default)
 - Downloadable PC Game
 - Other: _______________

 Game genre
 - Action
 - Adventure
 - Casual
 - Puzzle
 - RPG
 - Simulation
 - Strategy
 - Other: ____________
 ​
 Approximate Play Duration for your game?
 - 15 minutes or less
 - 30 to 60 minutes
 - Over 60 minutes
 - Other: ______________

 Number of Players for your game?
 - 1
 - 2
 - 2 to 4
 - 4
 - Other: _________
 ​
 Languages Supported by your game?
 (English should be checked by default)
 - English
 - Other: _______________

 Game Description
 (Max 150 words)
 Please provide a brief description of your game that is as specific as possible about the game mechanic, aesthetics, narrative (if applicable) and experience of playing the game. (max. 150 words). This gives an overview of your goals with the game, and who the game’s audience may be. It will guide the assignment of judges to your game, and be those judge’s first impression.
 Example: Def Comedy Ball Slam is an iPhone game that uses gestural input to recreate the pleasure and energy of talking smack on a Basketball Court. The game’s slams are fantastical comedy influenced by the greatest in modern insult comics. These slams make the game a true comedy exploration, providing fantastical entertainment and high energy hilarity.

 Artistic Statement
 (max 300 words)
 Please discuss the vision and inspiration behind the game, the context in which it was produced (art game, student game, etc.), and your goals for the design. (max. 300 words). This is your opportunity to explain to the judges why you made the game, and why you made the choices you did in designing and building it. Point out any creative decisions you feel particularly proud of, or that are particularly important to understanding the game. This material will be used in the IndieCade program and to teach IndieCade docents about your game.
 Example: Def Comedy Ball Slam was created specifically to recall the energy and excitement of being on or next to a basketball court during a player to player confrontation. We chose specifically to reference slams because of their dual meaning in both basketball and comedy - they captured the true energy we were going for. To design a game about slams, we immediately believed gestural input would allow the players to experience the same feelings as a participant in these activities on a basketball court, and our very basic rules system encourages players to enter a heightened state of competition (through verbal abuse), getting them ‘into’ the game.

 Installation Instructions
 (max 100 words. Default text: “Download and run the game installer on your PC”)
 Please enter instructions on how to install and launch the game (max. 100 words). Please be explicit about desired technology, and any non-traditional steps taken to install the software.
 Example: Def Comedy Ball Slam is installed by downloading the app from the Apple Store. You may use one of the provided download coupons to access the game for free, but these coupons will expire on May 15th. Once the game is installed, select ‘Pro Mode’ from the initial launch screen to connect the online database.

 Gameplay Instructions
 (max 300 words)
 Please enter instructions on how to play the game (max. 300 words). Include your desire to have judges play or not play tutorials, levels you want judges to begin on, and a point you’d like judges to reach to see the full breadth of the game. If this point requires a massive time investment, consider providing a shortcut, and instructions on how to access it. INCLUDE ALL OF YOUR CHEAT CODES HERE!
 Example: Def Comedy Ball Slam is played by waving your iPhonein your friends faces. Once you launch the game, you play by waving it in your friends face, and swinging the phone downward, when they turn away, ‘Slamming.’ Unlock the Super Slam power to see how the game develops. You may do so by tapping in the upper right corner of the launch screen.

 What's your story?​
 (max 150 words)
 Please tell us the story of how you got your game made, including resources and funding. (max. 150 words). This is a hook or pitch for your team and game, so make it short and gripping. It will be used in IndieCade promotional materials if your game is selected for the festival.
 Example: Def Comedy Ball Slam is a game made by truly passionate basketball fans that want to bring the pleasures of talking smack on and next to the court to the proletariat masses of iPhone users. After mortgaging our parent’s fully paid off homes, we raised the capital to develop the game with an oversees partner, but the game was going nowhere until we invested in a high end marketing company, who got us featured on Lifehacker. Slam it like you Talk it!

 Team Description​
 (max 150 words)
 Please provide a brief description of your team, the number of members, working philosophy, the context in which the work was creative, e.g., student team, arts collective, skunkworks within a larger development studio, as well as your work style, e.g., distributed, co-located, etc.; have distinct roles or all work on everything, etc. Include a sentence or two on how the team members met. (max. 150 words)
 Example: Humblebrag Studios met on the sidelines of the NBA finals, and quickly got into an argument about the best way to design a slam dunk game for mobile phones. After working for 6 months in a distributed fashion, we installed a weekly Skype and SCRUM system, and finished the game in two months.

 Level of Polish
 Are you continuing to work on your student game: _____________
 Are there known bugs in your game? Please describe: __________________

 Is your game the revised version of a game previously submitted to IndieCade?
 (“No” should be checked by default)
 - Yes
 - No
 Keywords
 (minimum one keyword, maximum 3)
 Please select at least one keyword
 - abstract
 - big game
 - interactive narrative
 - art game
 - social game
 - music game
 - first person game
 - casual game
 - action game
 - Adventure Game
 - Board, Card, or Tabletop Game
 - Commentary, Documentary, or Activist Game
 - Dance/Exercise
 - Interactive Experience
 - Multiplayer Networked Game
 - Multiplayer Single Screen
 - Puzzle Game
 - Racing Game
 - Role Playing Game
 - Shooting Game
 - Sim or God Game
 - Sports Game​

 Events and Venues
 (The item “None of the above” is checked by default)
 - IndieCade 2014
 - IndieCade East 2015
 - IndieCade E3 Showcase 2014
 - Different Games Arcade 2014
 - Different Games Arcade 2015
 - Come Out & Play 2014
 - Come Out & Play 2015
 - No Quarter 2014
 - GaymerX 2014
 - IGF 2014
 - ATL.CTRL.GDC 2014
 - ALT.CTRL.GDC 2015
 - Vector 2015
 - Vector 2014
 - GamerCamp 2014
 - Boston Indies 2014
 - PAX 2014
 - PAX 2015
 - PAX East 2014
 - PAX East 2015
 - GothCon 2014
 - GothCon 2015
 - Intercon 2014
 - Intercon 2015
 - Gary Con 2014
 - Gary Con 2015
 - PlayPublik 2014
 - GameCity 2014
 - South by Southwest 2014
 - South by Southwest 2015
 - Gen Con 2014
 - Gen Con 2015
 - MAGFest
 - Athens Plaython 2014
 - Athens Plaython 2014
 - w00t 2014
 - w00t 2015
 - Playful Arts Festival 2014
 - Screenshake 2015
 - Free to Play 2014
 - Games for Change 2015
 - Games, Learning and Society 2014
 - DiGRA 2014
 - DiGRA 2015
 - Meaningful Play 2014
 - Meaningful Play 2015
 - Serious Games Showcase
 - Wild Rumpus GDC 2015
 - Mild Rumpus GDC 2015
 - Global Game Jam 2014
 - Global Game Jam 2015
 - Freeplay 2015 (Melbourne)
 - Freeplay 2014 (Melbourne)
 - NYU Game Center Incubator Showcase 2014
 - Other: _____________________
 - None of the above



 Technical Requirements
 Check all that apply or are required!
 Peripherals
 - Headphones
 - Microphone
 - Projector
 - Speakers
 - Wireless Network
 - None of the above

 Hardware Platform
 - Android Phone
 - Android Tablet
 - Apple Macintosh
 - Apple Watch
 - Atari 2600
 - Google Glass
 - iPad
 - iPhone
 - iPod Touch
 - Nintendo DS
 - Ouya
 - PC
 - Physical or Board Game
 - Playstation 4
 - Wii
 - Wii U
 - Windows Phone
 - Xbox 360
 - Xbox One
 - Other: ____________

 Input Devices
 - D-Pad
 - Dance Pad
 - Dual analog controller
 - fitbit
 - Gamepad
 - Guitar Controller
 - Joystick
 - Keyboard
 - Kinect
 - Leap Motion
 - Mouse - 1 button
 - Mouse - 2 button
 - Mouse - 2 Button w/ Scroller
 - Neurosky MindSet
 - Oculus Rift
 - Other USB Controller (Specify below)
 - PlayStation Controller (Wired)
 - PlayStation Controller (Wireless)
 - PlayStation Move Controller
 - Trackball
 - Trackpad
 - Web Camera
 - Wii Nunchuck
 - Wiimote
 - Wild Divine IOM Active Feedback Hardware
 - Xbox Controller
 - Xbox Controllers x 2
 - Xbox Controllers x 4
 - Other: _______________

 Development Platform
 - .NET Framework
 - Java
 - Doom Engine
 - DSi - Dev Kit or Test Kit
 - Flash
 - Flash Player
 - Inform
 - Open Sim
 - Ouya Test Kit
 - PDF
 - PlayStation DevKit or Test Kit
 - PlayStation PSN
 - PlayStation Vita Test Kit
 - Quake Engine
 - RPG Maker
 - Second Life
 - Sifteo
 - Twine
 - Unity Web Player
 - Unreal Engine
 - Wii U Test Kit
 - Xbox Live Arcade (XBLA)
 - Other: __________________
 - None of the above

 Does your game support or require social networks?
 - Facebook
 - Twitter
 - None of the above

 Is your game browser-based?
 - Flash Player
 - Unity Web Player
 - None of the above
 Additional Software and Other Requirements

 Please include a link to any additional software required to play your game, such as a Flash Player, Java.
 If your game requires special controllers, such as use of a Wii or PS controller with a PC, you just provide a link to any drivers required.
 If you can't find your requirement in the list, please add it here. Remember to provide free links to any additional software required to run your game.
 Do not add tools you used to develop your game, unless the juror has to install them in order to play your entry.
 - Additional hardware ________________________
 - None of the above

 Media

 Screenshots​
 You must supply at least three high quality/resolution JPEG/PNG/GIF images (300 dpi preferred)
 - Submit with the screenshots in the DigiPen Game Gallery
 - We will send new screenshots to Ellen.Beeman@DigiPen.edu

 Video
 Video is required and should be between 60 seconds to 3 minutes in length
 - Youtube link for your game’s video: ________________





 */
