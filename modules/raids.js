//####################################################//
//####################################################//
//#####   _____            _____ _____   _____   #####//
//#####  |  __ \     /\   |_   _|  __ \ / ____|  #####//
//#####  | |__) |   /  \    | | | |  | | (___    #####//
//#####  |  _  /   / /\ \   | | | |  | |\___ \   #####//
//#####  | | \ \  / ____ \ _| |_| |__| |____) |  #####//
//#####  |_|  \_\/_/    \_\_____|_____/|_____/   #####//
//#####     RAID WEBHOOKS, AND SUBSCRIPTIONS     #####//
//####################################################//
//####################################################//

const Discord = require('discord.js');
const Subscription = require('./subscriptions/raids.js');
const insideGeofence = require('point-in-polygon');
const insideGeojson = require('point-in-geopolygon');

module.exports.run = async (MAIN, raid, main_area, sub_area, embed_area, server, timezone) => {

  // CHECK SUBSCRIPTION CONFIG
  if(MAIN.config.RAID.Subscriptions == 'ENABLED'){
    Subscription.run(MAIN, raid, main_area, sub_area, embed_area, server, timezone);
  } //else{ console.info('[Pokébot] Raid ignored due to Disabled Subscription setting.'); }

  if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Received a Raid.'); }

  // FILTER FEED TYPE FOR EGG, BOSS, OR BOTH
  let type = '';
  if(raid.cp > 0){ type = 'Boss'; } else{ type = 'Egg'; }

  // CHECK EACH FEED FILTER
  MAIN.Raid_Channels.forEach( async (raid_channel,index) => {

    // DEFINE MORE VARIABLES
    let geofences = raid_channel[1].geofences.split(',');
    let channel = MAIN.channels.get(raid_channel[0]);
    let filter = MAIN.Filters.get(raid_channel[1].filter);

    // THROW ERRORS AND BREAK FOR INVALID DATA
    if(!filter){ console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] The filter defined for'+raid_channel[0]+' does not appear to exist.'); }
    else if(!channel){ console.error('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] The channel '+raid_channel[0]+' does not appear to exist.'); }

    // CHECK RAID TYPE
    else if(filter.Egg_Or_Boss_Or_Both.toLowerCase() == 'both' || filter.Egg_Or_Boss_Or_Both.toLowerCase() == type.toLowerCase()){

      // FILTER FOR RAID LEVEL
      if(filter.Raid_Levels.indexOf(raid.level) >= 0){

        // AREA FILTER
        if(geofences.indexOf(server.name)>=0 || geofences.indexOf(main_area)>=0 || geofences.indexOf(sub_area)>=0){

          // CHECK FOR EX ELIGIBLE REQUIREMENT
          if(filter.Ex_Eligible_Only == undefined || filter.Ex_Eligible_Only != true){
            if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Raid Passed Filters for '+raid_channel[0]+'.'); }
            send_raid(MAIN, channel, raid, type, main_area, sub_area, embed_area, server, timezone);
          }
          else if(filter.Ex_Eligible_Only == raid.ex_raid_eligible || filter.Ex_Eligible_Only == raid.ex_raid_eligible){
            if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Raid Passed Filters for '+raid_channel[0]+'.'); }
            send_raid(MAIN, channel, raid, type, main_area, sub_area, embed_area, server, timezone);
          }
        }
        else{
          if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Raid Did Not Pass Channel Geofences for '+raid_channel[0]+'. Expected: '+raid_channel[1].geofences+' Saw: '+server.name+'|'+main_area+'|'+sub_area); }
        }
      }
      else{
        if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Raid Did Not Pass Level Filter for '+raid_channel[0]+' Expected: '+filter.Raid_Levels.toString()+' Saw: '+raid.level); }
      }
    }
    else{
      if(MAIN.debug.Raids == 'ENABLED'){ console.info('[DEBUG] [Modules] [raids.js] Raid Did Not Discord Filter for '+raid_channel[0]+'. Expected: '+filter.Egg_Or_Boss_Or_Both+', Saw: '+type.toLowerCase()); }
    }
  });
}

function send_raid(MAIN, channel, raid, type, main_area, sub_area, embed_area, server, timezone){

  // VARIABLES
  let time_now = new Date().getTime();
  let hatch_time = MAIN.Bot_Time(raid.start, '1', timezone);
  let end_time = MAIN.Bot_Time(raid.end, '1', timezone);
  let hatch_mins = Math.floor((raid.start-(time_now/1000))/60);
  let end_mins = Math.floor((raid.end-(time_now/1000))/60);

  MAIN.Static_Map_Tile(raid.latitude, raid.longitude, 'raid').then(async function(img_url){

    // DETERMINE GYM CONTROL
    let defending_team = '';
    switch(raid.team_id){
      case 1: defending_team = MAIN.emotes.mystic+' Gym'; break;
      case 2: defending_team = MAIN.emotes.valor+' Gym'; break;
      case 3: defending_team = MAIN.emotes.instinct+' Gym'; break;
      default: defending_team = 'Uncontested Gym';
    }

    // GET RAID LEVEL
    let embed_color = '';
    switch(raid.level){
      case 1:
      case 2: embed_color = 'f358fb'; break;
      case 3:
      case 4: embed_color = 'ffd300'; break;
      case 5: embed_color = '5b00de'; break;
    }

    // CHECK IF SPONSORED GYM
    let raid_sponsor = '';
    if(raid.ex_raid_eligible == true){ raid_sponsor = ' | '+MAIN.emotes.exPass+' Eligible'; }

    // CHECK FOR GYM NAME
    let gym_name = '';
    if(!raid.gym_name){ gym_name = 'No Name'; }
    else{ gym_name = raid.gym_name; }

    // DETERMINE IF IT'S AN EGG OR A RAID
    let embed_thumb = '', raid_embed = '';
    switch(type){

      case 'Egg':
        // GET EGG IMAGE
        switch(raid.level){
          case 1:
          case 2: embed_thumb = 'https://i.imgur.com/ABNC8aP.png'; break;
          case 3:
          case 4: embed_thumb = 'https://i.imgur.com/zTvNq7j.png'; break;
          case 5: embed_thumb = 'https://i.imgur.com/jaTCRXJ.png'; break;
        }

        // CREATE THE EGG EMBED
        raid_embed = new Discord.RichEmbed().setThumbnail(embed_thumb).setColor(embed_color)
          .addField(raid.gym_name, embed_area, false)
          .addField('Hatches: '+hatch_time+' (*'+hatch_mins+' Mins*)', 'Level '+raid.level+' | '+defending_team+raid_sponsor, false)
          .addField('Directions:','[Google Maps](https://www.google.com/maps?q='+raid.latitude+','+raid.longitude+') | [Apple Maps](http://maps.apple.com/maps?daddr='+raid.latitude+','+raid.longitude+'&z=10&t=s&dirflg=w) | [Waze](https://waze.com/ul?ll='+raid.latitude+','+raid.longitude+'&navigate=yes)',false)
          .setImage(img_url);

        // CHECK DISCORD CONFIG
        if(MAIN.config.RAID.Discord_Feeds == 'ENABLED'){
          if(MAIN.logging == 'ENABLED'){ console.info('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] [Modules] [raids.js] Sent a Level '+raid.level+' '+type+' to '+channel.guild.name+' ('+channel.id+').'); }
          return MAIN.Send_Embed(raid_embed, channel.id);
        }
        else{
          return console.info('[Pokébot] Raid ignored due to Disabled Discord Feed setting.');
        }
        break;

      // RAID IS A BOSS
      case 'Boss':

        // DETERMINE POKEMON NAME AND TYPE
        let pokemon_type = '';
        let pokemon_name = MAIN.pokemon[raid.pokemon_id].name;
        await MAIN.pokemon[raid.pokemon_id].types.forEach((type) => {  pokemon_type += type+' '+MAIN.emotes[type.toLowerCase()]+' / '; });
        pokemon_type = pokemon_type.slice(0,-3);

        // DETERMINE MOVE NAMES AND TYPES
        let move_name_1 = MAIN.moves[raid.move_1].name;
        let move_type_1 = await MAIN.Get_Type(raid.move_1);
        let move_name_2 = MAIN.moves[raid.move_2].name;
        let move_type_2 = await MAIN.Get_Type(raid.move_2);

        // GET THE RAID BOSS SPRITE
        let raid_url = await MAIN.Get_Sprite(raid.form, raid.pokemon_id);

        // GET THE BOSS MOVESET
        if(!MAIN.moves[raid.move_1].name){ console.error('Move ID #'+raid.move_1+' not found in pokemon.json. Please report to the Discord.'); }
        if(!MAIN.moves[raid.move_2].name){ console.error('Move ID #'+raid.move_2+' not found in pokemon.json. Please report to the Discord.'); }

        // CREATE THE RAID EMBED
        raid_embed = new Discord.RichEmbed().setThumbnail(raid_url).setColor(embed_color)
          .setTitle('**'+pokemon_name+'** has taken over a Gym!')
          .setDescription(move_name_1+' '+move_type_1+' / '+move_name_2+' '+move_type_2)
          .addField(gym_name+' | '+embed_area, pokemon_type, false)
          .addField('Raid Ends: '+end_time+' (*'+end_mins+' Mins*)', 'Level '+raid.level+' | '+defending_team+raid_sponsor, false)
          .addField('Directions:','[Google Maps](https://www.google.com/maps?q='+raid.latitude+','+raid.longitude+') | [Apple Maps](http://maps.apple.com/maps?daddr='+raid.latitude+','+raid.longitude+'&z=10&t=s&dirflg=w) | [Waze](https://waze.com/ul?ll='+raid.latitude+','+raid.longitude+'&navigate=yes)',false)
          .setImage(img_url);

        // CHECK DISCORD CONFIG
        if(MAIN.config.RAID.Discord_Feeds == 'ENABLED'){
          if(MAIN.logging == 'ENABLED'){ console.info('[Pokébot] ['+MAIN.Bot_Time(null,'stamp')+'] [Modules] [raids.js] Sent a '+pokemon_name+' Raid '+type+' to '+channel.guild.name+' ('+channel.id+').'); }
          return MAIN.Send_Embed(raid_embed, channel.id);
        }
        else{
          return console.info('[Pokébot] Raid ignored due to Disabled Discord Feed setting.');
        } break;
    } return;
  });
}
