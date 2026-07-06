import React, { useState, useMemo, useEffect, useCallback, useRef } from "react";

// ─── SUPABASE ────────────────────────────────────────────────────────────────
// Replace these values with your project URL and anon key from:
// Supabase Dashboard → Settings → API
import { createClient } from '@supabase/supabase-js';
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || 'https://hcepyehnqljhgrbnkvmy.supabase.co';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_QY2aPl0CL1VmhmDfBr5gag_RjrY0VLO';

// Validate config before creating the client so a bad/missing URL shows a
// helpful message instead of crashing the whole app to a blank page.
const SUPABASE_CONFIGURED = /^https?:\/\/.+\.supabase\.co\/?$/.test(SUPABASE_URL) && SUPABASE_ANON_KEY.length > 10;

let supabase;
if (SUPABASE_CONFIGURED) {
  supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
} else {
  // Stub client — every call resolves to an error instead of throwing on init.
  const stubErr = { message: 'Supabase not configured. Check your .env file and restart the dev server.' };
  const chain = { select(){return this;}, insert(){return this;}, update(){return this;}, delete(){return this;}, upsert(){return this;}, eq(){return this;}, ilike(){return this;}, not(){return this;}, order(){return this;}, limit(){return this;}, single(){return Promise.resolve({data:null,error:stubErr});}, then(r){return Promise.resolve({data:[],error:stubErr}).then(r);} };
  supabase = {
    auth: {
      getSession: ()=>Promise.resolve({data:{session:null}}),
      onAuthStateChange: ()=>({data:{subscription:{unsubscribe(){}}}}),
      signUp: ()=>Promise.resolve({data:null,error:stubErr}),
      signInWithPassword: ()=>Promise.resolve({data:null,error:stubErr}),
      signInWithOAuth: ()=>Promise.resolve({data:null,error:stubErr}),
      signOut: ()=>Promise.resolve({error:null}),
    },
    from: ()=>chain,
    storage: { from: ()=>({ upload:()=>Promise.resolve({error:stubErr}), getPublicUrl:()=>({data:{publicUrl:null}}), list:()=>Promise.resolve({data:[],error:stubErr}) }) },
    rpc: ()=>Promise.resolve({data:null,error:stubErr}),
  };
}

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,300..600;1,9..144,300..500&family=Inter:wght@400;500;600&family=DM+Mono:wght@400;500&display=swap');`;

// ─── RATING DIMENSIONS ───────────────────────────────────────────────────────
const RATING_DIMS = [
  { id:"aroma",     label:"Aroma",     desc:"Nose before the sip",            weight:0.25 },
  { id:"flavour",   label:"Flavour",   desc:"Core taste experience",           weight:0.35 },
  { id:"mouthfeel", label:"Mouthfeel", desc:"Body, texture, weight",           weight:0.15 },
  { id:"finish",    label:"Finish",    desc:"Length and quality of aftertaste",weight:0.25 },
];
const DIM_COLORS = { aroma:"#1a2f5e", flavour:"#c4622d", mouthfeel:"#5a3e28", finish:"#2d6b4a" };

function computeOverall(scores) {
  if(!scores) return 0;
  let total=0, weight=0;
  RATING_DIMS.forEach(d=>{ if(scores[d.id]){ total+=scores[d.id]*d.weight; weight+=d.weight; } });
  return weight>0 ? Math.round((total/weight)*10)/10 : 0;
}
function overallFromEntry(e) { return e.scores ? computeOverall(e.scores) : (e.rating||0); }

// ─── FLAVOUR FAMILIES ────────────────────────────────────────────────────────
const NOTE_FAMILIES = {
  Fruit:  { color:"#c4622d", bg:"#fdf0e8", border:"#f0c8a8", notes:["Blueberry","Strawberry","Raspberry","Cherry","Peach","Mango","Citrus","Lemon","Orange peel","Apple","Apricot","Plum","Fig","Grape"] },
  Floral: { color:"#1a2f5e", bg:"#e8f0f8", border:"#bcd0e8", notes:["Jasmine","Rose","Lavender","Elderflower","Hibiscus","Violet","Honeysuckle"] },
  Sweet:  { color:"#8b6800", bg:"#fdf5e0", border:"#e8cc80", notes:["Caramel","Toffee","Brown sugar","Honey","Vanilla","Molasses","Maple","Butterscotch","Milk chocolate"] },
  Nutty:  { color:"#5a3e28", bg:"#f5f0e8", border:"#c8b090", notes:["Hazelnut","Almond","Walnut","Pecan","Marzipan","Macadamia"] },
  Roast:  { color:"#2a1f18", bg:"#eee8e0", border:"#b8a890", notes:["Dark chocolate","Cocoa","Tobacco","Cedar","Smoky","Roasty","Malty","Toasty"] },
  Earthy: { color:"#2d5a38", bg:"#e8f2e8", border:"#a8c8a8", notes:["Earthy","Spice","Black tea","Green tea","Wine-like","Fermented","Herbal","Leather"] },
};
const FAM_KEYS = Object.keys(NOTE_FAMILIES);
const NOTE_TO_FAM = {};
Object.entries(NOTE_FAMILIES).forEach(([f,d])=>d.notes.forEach(n=>{NOTE_TO_FAM[n]=f;}));

const BEAN_CATALOGUE = [
  { id:"b1",  name:"Ethiopia Yirgacheffe",      roasterId:"r1", roast:"light",    process:"Natural",           origin:"Ethiopia",   profile:{Fruit:9,Floral:8,Sweet:5,Nutty:1,Roast:1,Earthy:1}, why:"Your Fruit and Floral scores align exactly — blueberry, jasmine, bergamot." },
  { id:"b2",  name:"Kenya AA Nyeri",            roast:"light",    process:"Washed",            origin:"Kenya",      profile:{Fruit:8,Floral:4,Sweet:5,Nutty:1,Roast:1,Earthy:3}, why:"Bright blackcurrant and citrus. Natural for fruit-forward palates." },
  { id:"b3",  name:"Panama Gesha",              roast:"light",    process:"Washed",            origin:"Panama",     profile:{Fruit:7,Floral:9,Sweet:6,Nutty:1,Roast:1,Earthy:1}, why:"The benchmark for floral complexity — jasmine, peach blossom, bergamot." },
  { id:"b4",  name:"Colombia Huila",            roast:"medium",   process:"Washed",            origin:"Colombia",   profile:{Fruit:5,Floral:3,Sweet:7,Nutty:5,Roast:3,Earthy:2}, why:"Caramel, hazelnut, red apple. A balanced bridge between sweet and nutty." },
  { id:"b5",  name:"Brazil Sul de Minas",       roast:"medium",   process:"Natural",           origin:"Brazil",     profile:{Fruit:3,Floral:1,Sweet:7,Nutty:8,Roast:5,Earthy:3}, why:"Milk chocolate, almond, brown sugar. Smooth and low-acid." },
  { id:"b6",  name:"Guatemala Antigua",         roast:"med_dark", process:"Washed",            origin:"Guatemala",  profile:{Fruit:4,Floral:2,Sweet:6,Nutty:6,Roast:6,Earthy:3}, why:"Dark chocolate, walnut, bittersweet finish." },
  { id:"b7",  name:"Yemen Mokha",               roast:"medium",   process:"Natural",           origin:"Yemen",      profile:{Fruit:5,Floral:4,Sweet:5,Nutty:4,Roast:4,Earthy:7}, why:"Dried fruit, leather, exotic spice. For earthy-adventurous palates." },
  { id:"b8",  name:"Ethiopia Anaerobic",        roast:"light",    process:"Anaerobic Natural", origin:"Ethiopia",   profile:{Fruit:10,Floral:7,Sweet:6,Nutty:1,Roast:1,Earthy:2}, why:"Tropical fruit explosion — mango, pineapple. Top pick for high-Fruit profiles." },
  { id:"b9",  name:"Rwanda Nyamasheke",         roast:"light",    process:"Washed",            origin:"Rwanda",     profile:{Fruit:7,Floral:6,Sweet:5,Nutty:2,Roast:1,Earthy:2}, why:"Peach, hibiscus, gentle citrus. Delicate and clean." },
  { id:"b10", name:"Indonesia Sumatra",         roast:"dark",     process:"Wet-Hulled",        origin:"Indonesia",  profile:{Fruit:2,Floral:1,Sweet:4,Nutty:4,Roast:6,Earthy:9}, why:"Cedar, dark chocolate, herbal. For Earthy and Roast-dominant palates." },
  { id:"b11", name:"Costa Rica Tarrazu",        roast:"medium",   process:"Honey",             origin:"Costa Rica", profile:{Fruit:5,Floral:3,Sweet:8,Nutty:4,Roast:3,Earthy:2}, why:"Honey, nectarine, milk chocolate. Top pick for Sweet-dominant palates." },
  { id:"b12", name:"Colombia Gesha Anaerobico", roast:"light",    process:"Anaerobic Washed",  origin:"Colombia",   profile:{Fruit:8,Floral:8,Sweet:7,Nutty:1,Roast:1,Earthy:1}, why:"Jasmine, mango, elderflower. Extended fermentation lifts every aromatic." },
];

const ROASTERS = [
  {
    id:"r1", name:"Square Mile Coffee", city:"London", country:"UK", neighbourhood:"Bethnal Green",
    speciality:"Nordic-style light roasts, precise sourcing. One of London's most respected roasters since 2008.",
    styles:["light","light_med"], rating:4.9, url:"squaremilecoffee.com", verified:true,
    beans:[
      { id:"r1b1", name:"Ethiopia Halo Beriti", origin:"Ethiopia", process:"Washed", roast:"light", profile:{Fruit:9,Floral:8,Sweet:5,Nutty:1,Roast:1,Earthy:1}, notes:"Jasmine, peach, bergamot. Exceptionally clean and bright.", price:"£14/250g" },
      { id:"r1b2", name:"Kenya Kamwangi", origin:"Kenya", process:"Washed", roast:"light", profile:{Fruit:8,Floral:4,Sweet:4,Nutty:1,Roast:1,Earthy:3}, notes:"Blackcurrant, grapefruit, wine-like acidity.", price:"£16/250g" },
      { id:"r1b3", name:"Panama Gesha", origin:"Panama", process:"Washed", roast:"light", profile:{Fruit:7,Floral:9,Sweet:6,Nutty:1,Roast:1,Earthy:1}, notes:"Rose, lychee, elderflower. Rare and extraordinary.", price:"£28/250g" },
      { id:"r1b4", name:"Red Brick Blend", origin:"Blend", process:"Washed", roast:"medium", profile:{Fruit:4,Floral:2,Sweet:7,Nutty:5,Roast:4,Earthy:2}, notes:"Milk chocolate, hazelnut, caramel. Their signature espresso.", price:"£12/250g" },
    ]
  },
  {
    id:"r2", name:"Monmouth Coffee", city:"London", country:"UK", neighbourhood:"Borough Market",
    speciality:"Classic blends and balanced single origins. A London institution since 1978.",
    styles:["medium","light_med"], rating:4.8, url:"monmouthcoffee.co.uk", verified:true,
    beans:[
      { id:"r2b1", name:"Colombia El Placer", origin:"Colombia", process:"Washed", roast:"medium", profile:{Fruit:5,Floral:3,Sweet:7,Nutty:5,Roast:3,Earthy:2}, notes:"Caramel, red apple, walnut. Approachable and reliable.", price:"£12/250g" },
      { id:"r2b2", name:"Guatemala Finca El Injerto", origin:"Guatemala", process:"Washed", roast:"medium", profile:{Fruit:4,Floral:2,Sweet:6,Nutty:6,Roast:5,Earthy:3}, notes:"Dark chocolate, brown sugar, almond.", price:"£13/250g" },
      { id:"r2b3", name:"House Blend", origin:"Blend", process:"Washed", roast:"medium", profile:{Fruit:4,Floral:2,Sweet:7,Nutty:5,Roast:5,Earthy:2}, notes:"Toffee, milk chocolate, gentle citrus. Perfect for milk drinks.", price:"£11/250g" },
    ]
  },
  {
    id:"r3", name:"Assembly Coffee", city:"London", country:"UK", neighbourhood:"Bermondsey",
    speciality:"Thoughtful sourcing, approachable light roasts across multiple London sites.",
    styles:["light","light_med"], rating:4.7, url:"assemblycoffee.co.uk", verified:true,
    beans:[
      { id:"r3b1", name:"Ethiopia Guji Natural", origin:"Ethiopia", process:"Natural", roast:"light", profile:{Fruit:9,Floral:6,Sweet:6,Nutty:1,Roast:1,Earthy:2}, notes:"Blueberry, strawberry, dark chocolate.", price:"£13/250g" },
      { id:"r3b2", name:"Colombia Huila Washed", origin:"Colombia", process:"Washed", roast:"light_med", profile:{Fruit:5,Floral:4,Sweet:7,Nutty:3,Roast:2,Earthy:2}, notes:"Peach, caramel, lemon zest.", price:"£12/250g" },
      { id:"r3b3", name:"Kenya Kainamui", origin:"Kenya", process:"Washed", roast:"light", profile:{Fruit:8,Floral:5,Sweet:4,Nutty:1,Roast:1,Earthy:2}, notes:"Blackcurrant, hibiscus, citrus.", price:"£14/250g" },
    ]
  },
  {
    id:"r5", name:"Onyx Coffee Lab", city:"Bentonville", country:"USA", neighbourhood:"AR",
    speciality:"Award-winning competition roasts, full transparency on sourcing and process.",
    styles:["light","light_med"], rating:4.9, url:"onyxcoffeelab.com", verified:true,
    beans:[
      { id:"r5b1", name:"Ethiopia Kayon Mountain", origin:"Ethiopia", process:"Natural", roast:"light", profile:{Fruit:10,Floral:7,Sweet:6,Nutty:1,Roast:1,Earthy:1}, notes:"Tropical fruit, blueberry, jasmine. Consistently outstanding.", price:"$22/250g" },
      { id:"r5b2", name:"Colombia Gesha La Palma", origin:"Colombia", process:"Anaerobic Washed", roast:"light", profile:{Fruit:8,Floral:9,Sweet:7,Nutty:1,Roast:1,Earthy:1}, notes:"Elderflower, mango, white peach. Rare and floral.", price:"$36/250g" },
      { id:"r5b3", name:"Kenya Kiamabara", origin:"Kenya", process:"Washed", roast:"light", profile:{Fruit:8,Floral:5,Sweet:4,Nutty:1,Roast:1,Earthy:3}, notes:"Blackcurrant, tomato, bright acidity.", price:"$24/250g" },
      { id:"r5b4", name:"Monarch Blend", origin:"Blend", process:"Washed", roast:"medium", profile:{Fruit:5,Floral:3,Sweet:7,Nutty:4,Roast:4,Earthy:2}, notes:"Caramel, milk chocolate, almond. Their espresso workhorse.", price:"$18/250g" },
    ]
  },
  {
    id:"r7", name:"Gardelli Specialty", city:"Forli", country:"Italy", neighbourhood:"Emilia-Romagna",
    speciality:"Competition-level roasting, experimental processing. Among the world's most decorated.",
    styles:["light"], rating:4.9, url:"gardellispecialty.com", verified:true,
    beans:[
      { id:"r7b1", name:"Ethiopia Carbonic Maceration", origin:"Ethiopia", process:"Carbonic Maceration", roast:"light", profile:{Fruit:10,Floral:8,Sweet:7,Nutty:1,Roast:1,Earthy:2}, notes:"Passionfruit, lychee, rose. Unprecedented fruit intensity.", price:"€28/250g" },
      { id:"r7b2", name:"Colombia Gesha Extended Ferment", origin:"Colombia", process:"Extended Fermentation", roast:"light", profile:{Fruit:8,Floral:9,Sweet:8,Nutty:1,Roast:1,Earthy:1}, notes:"Jasmine, pear, honey, bergamot.", price:"€32/250g" },
      { id:"r7b3", name:"Panama Gesha Washed", origin:"Panama", process:"Washed", roast:"light", profile:{Fruit:7,Floral:10,Sweet:6,Nutty:1,Roast:1,Earthy:1}, notes:"The purest floral expression in coffee.", price:"€45/250g" },
    ]
  },
  {
    id:"r8", name:"Tim Wendelboe", city:"Oslo", country:"Norway", neighbourhood:"Grunerloekka",
    speciality:"Scandinavian light roast mastery. Direct farm relationships, meticulous quality.",
    styles:["light"], rating:4.9, url:"timwendelboe.no", verified:true,
    beans:[
      { id:"r8b1", name:"Ethiopia Yukro", origin:"Ethiopia", process:"Washed", roast:"light", profile:{Fruit:8,Floral:8,Sweet:5,Nutty:1,Roast:1,Earthy:2}, notes:"Bergamot, lemon, jasmine. Textbook Nordic light roast.", price:"NOK 195/250g" },
      { id:"r8b2", name:"Colombia La Palma y El Tucan", origin:"Colombia", process:"Washed", roast:"light", profile:{Fruit:6,Floral:7,Sweet:6,Nutty:2,Roast:1,Earthy:1}, notes:"Honeysuckle, peach, clean sweetness.", price:"NOK 215/250g" },
      { id:"r8b3", name:"Kenya Nyeri Washed", origin:"Kenya", process:"Washed", roast:"light", profile:{Fruit:8,Floral:5,Sweet:4,Nutty:1,Roast:1,Earthy:2}, notes:"Blackcurrant, citrus, wine-like acidity.", price:"NOK 205/250g" },
    ]
  },
  {
    id:"r9", name:"Five Elephant", city:"Berlin", country:"Germany", neighbourhood:"Kreuzberg",
    speciality:"Light roasts and beloved cheesecake. A Berlin institution with exacting standards.",
    styles:["light","light_med"], rating:4.8, url:"fiveelephant.com", verified:false,
    beans:[
      { id:"r9b1", name:"Ethiopia Kochere", origin:"Ethiopia", process:"Natural", roast:"light", profile:{Fruit:9,Floral:6,Sweet:6,Nutty:1,Roast:1,Earthy:2}, notes:"Blueberry, dark chocolate, floral lift.", price:"€14/250g" },
      { id:"r9b2", name:"Rwanda Gitesi", origin:"Rwanda", process:"Washed", roast:"light", profile:{Fruit:7,Floral:6,Sweet:5,Nutty:2,Roast:1,Earthy:2}, notes:"Peach, hibiscus, gentle citrus.", price:"€13/250g" },
      { id:"r9b3", name:"Kenya Kiambu", origin:"Kenya", process:"Washed", roast:"light", profile:{Fruit:8,Floral:4,Sweet:4,Nutty:1,Roast:1,Earthy:3}, notes:"Blackcurrant, tomato, grapefruit.", price:"€15/250g" },
    ]
  },
  {
    id:"r10", name:"Proud Mary Coffee", city:"Melbourne", country:"Australia", neighbourhood:"Collingwood",
    speciality:"Experimental natural process specialists. Big, complex, fruit-forward coffees.",
    styles:["light","light_med"], rating:4.8, url:"proudmarycoffee.com.au", verified:true,
    beans:[
      { id:"r10b1", name:"Ethiopia Anaerobic Natural", origin:"Ethiopia", process:"Anaerobic Natural", roast:"light", profile:{Fruit:10,Floral:6,Sweet:7,Nutty:1,Roast:1,Earthy:2}, notes:"Mango, strawberry, tropical fruit bomb.", price:"AUD $28/250g" },
      { id:"r10b2", name:"Colombia Gesha Natural", origin:"Colombia", process:"Natural", roast:"light", profile:{Fruit:8,Floral:7,Sweet:7,Nutty:1,Roast:1,Earthy:1}, notes:"Pineapple, elderflower, honey.", price:"AUD $34/250g" },
      { id:"r10b3", name:"NFA Blend", origin:"Blend", process:"Washed", roast:"medium", profile:{Fruit:5,Floral:3,Sweet:7,Nutty:4,Roast:4,Earthy:2}, notes:"Caramel, milk chocolate. Their benchmark espresso.", price:"AUD $22/250g" },
    ]
  },
  {
    id:"r11", name:"Fuglen Coffee", city:"Tokyo", country:"Japan", neighbourhood:"Tomigaya",
    speciality:"Norwegian light roasts in Tokyo. Iconic third-wave outpost, immaculate execution.",
    styles:["light"], rating:4.8, url:"fuglen.no", verified:false,
    beans:[
      { id:"r11b1", name:"Ethiopia Yirgacheffe", origin:"Ethiopia", process:"Washed", roast:"light", profile:{Fruit:8,Floral:8,Sweet:5,Nutty:1,Roast:1,Earthy:1}, notes:"Jasmine, bergamot, lemon. Classic and refined.", price:"¥2,200/200g" },
      { id:"r11b2", name:"Colombia Single Farm", origin:"Colombia", process:"Washed", roast:"light", profile:{Fruit:6,Floral:6,Sweet:6,Nutty:2,Roast:1,Earthy:1}, notes:"Peach, honeysuckle, clean sweetness.", price:"¥2,400/200g" },
    ]
  },
  {
    id:"r12", name:"Common Man Coffee", city:"Singapore", country:"Singapore", neighbourhood:"Robertson Quay",
    speciality:"Award-winning blends and Asian-focused sourcing. Approachable quality.",
    styles:["medium","light_med"], rating:4.7, url:"commonmancoffee.com", verified:true,
    beans:[
      { id:"r12b1", name:"Mavericks Blend", origin:"Blend", process:"Washed", roast:"medium", profile:{Fruit:4,Floral:2,Sweet:8,Nutty:5,Roast:4,Earthy:2}, notes:"Caramel, milk chocolate, hazelnut. Crowd-pleasing espresso.", price:"SGD $24/250g" },
      { id:"r12b2", name:"Ethiopia Seasonal", origin:"Ethiopia", process:"Natural", roast:"light_med", profile:{Fruit:7,Floral:5,Sweet:6,Nutty:2,Roast:2,Earthy:2}, notes:"Berry, honey, gentle floral notes.", price:"SGD $28/250g" },
      { id:"r12b3", name:"Indonesia Sumatra", origin:"Indonesia", process:"Wet-Hulled", roast:"medium", profile:{Fruit:2,Floral:1,Sweet:4,Nutty:5,Roast:6,Earthy:8}, notes:"Cedar, dark chocolate, earthy spice.", price:"SGD $22/250g" },
    ]
  },
  {
    id:"r6", name:"Intelligentsia", city:"Chicago", country:"USA", neighbourhood:"Wicker Park",
    speciality:"Pioneers of direct trade. Consistent quality across espresso and filter.",
    styles:["light","medium"], rating:4.7, url:"intelligentsia.com", verified:true,
    beans:[
      { id:"r6b1", name:"Black Cat Espresso", origin:"Blend", process:"Washed", roast:"medium", profile:{Fruit:5,Floral:2,Sweet:7,Nutty:5,Roast:5,Earthy:2}, notes:"Dark chocolate, walnut, brown sugar. Their flagship.", price:"$18/250g" },
      { id:"r6b2", name:"Ethiopia Yirgacheffe Kochere", origin:"Ethiopia", process:"Washed", roast:"light", profile:{Fruit:8,Floral:7,Sweet:5,Nutty:1,Roast:1,Earthy:1}, notes:"Jasmine, lemon, bergamot.", price:"$22/250g" },
      { id:"r6b3", name:"Guatemala Finca Mauricio Shuan", origin:"Guatemala", process:"Washed", roast:"medium", profile:{Fruit:4,Floral:3,Sweet:7,Nutty:5,Roast:4,Earthy:3}, notes:"Caramel, hazelnut, apple.", price:"$20/250g" },
    ]
  },
];


// ─── PAYWALL TIERS ───────────────────────────────────────────────────────────
const FEATURES = {
  // Free features
  journal:        { tier:"free" },
  logging:        { tier:"free" },
  recipes:        { tier:"free" },
  cafeDirectory:  { tier:"free", note:"Browse only" },
  globalFeed:     { tier:"free", note:"Read only" },
  basicStats:     { tier:"free", note:"Count, avg score, brew methods" },
  // Pro features
  palateRadar:    { tier:"pro" },
  beanMatches:    { tier:"pro" },
  roasterMatch:   { tier:"pro" },
  friendsFeed:    { tier:"pro" },
  advancedStats:  { tier:"pro" },
  cafeContribute: { tier:"pro", note:"Your logs count toward rankings" },
  dataExport:     { tier:"pro" },
  dimBreakdown:   { tier:"pro" },
};

// ─── SAMPLE CAFÉ DIRECTORY DATA ──────────────────────────────────────────────
const CAFE_DIRECTORY = [
  { id:"c1",  name:"Workshop Coffee",         city:"London",       country:"UK",        neighbourhood:"Clerkenwell",    logs:847,  scores:{aroma:8.6,flavour:8.8,mouthfeel:8.2,finish:8.5}, topNotes:["Jasmine","Citrus","Blueberry"],    roaster:"Workshop Coffee",     verified:true  },
  { id:"c2",  name:"Fuglen Tokyo",            city:"Tokyo",        country:"Japan",     neighbourhood:"Tomigaya",       logs:612,  scores:{aroma:9.1,flavour:9.0,mouthfeel:8.6,finish:9.2}, topNotes:["Peach","Elderflower","Rose"],      roaster:"Tim Wendelboe",       verified:true  },
  { id:"c3",  name:"Tim Wendelboe",           city:"Oslo",         country:"Norway",    neighbourhood:"Grunerloekka",   logs:534,  scores:{aroma:9.3,flavour:9.4,mouthfeel:8.9,finish:9.1}, topNotes:["Jasmine","Citrus","Honey"],        roaster:"Tim Wendelboe",       verified:true  },
  { id:"c4",  name:"Onyx Coffee Lab",         city:"Bentonville",  country:"USA",       neighbourhood:"AR",             logs:489,  scores:{aroma:9.0,flavour:9.2,mouthfeel:8.7,finish:8.9}, topNotes:["Blueberry","Mango","Rose"],        roaster:"Onyx Coffee Lab",     verified:true  },
  { id:"c5",  name:"Five Elephant",           city:"Berlin",       country:"Germany",   neighbourhood:"Kreuzberg",      logs:421,  scores:{aroma:8.7,flavour:8.9,mouthfeel:8.4,finish:8.6}, topNotes:["Peach","Caramel","Citrus"],        roaster:"Five Elephant",       verified:true  },
  { id:"c6",  name:"Proud Mary",              city:"Melbourne",    country:"Australia", neighbourhood:"Collingwood",    logs:398,  scores:{aroma:8.9,flavour:9.1,mouthfeel:8.5,finish:8.8}, topNotes:["Mango","Strawberry","Jasmine"],    roaster:"Proud Mary",          verified:true  },
  { id:"c7",  name:"Square Mile Coffee",      city:"London",       country:"UK",        neighbourhood:"Bethnal Green",  logs:376,  scores:{aroma:8.8,flavour:8.7,mouthfeel:8.3,finish:8.6}, topNotes:["Blueberry","Dark chocolate","Jasmine"],roaster:"Square Mile",      verified:true  },
  { id:"c8",  name:"Intelligentsia",          city:"Chicago",      country:"USA",       neighbourhood:"Wicker Park",    logs:344,  scores:{aroma:8.5,flavour:8.6,mouthfeel:8.2,finish:8.4}, topNotes:["Caramel","Citrus","Hazelnut"],     roaster:"Intelligentsia",      verified:true  },
  { id:"c9",  name:"Commonman Coffee",        city:"Singapore",    country:"Singapore", neighbourhood:"Robertson Quay", logs:298,  scores:{aroma:8.4,flavour:8.7,mouthfeel:8.5,finish:8.3}, topNotes:["Honey","Caramel","Citrus"],        roaster:"Common Man",          verified:true  },
  { id:"c10", name:"Assembly Coffee",         city:"London",       country:"UK",        neighbourhood:"Bermondsey",     logs:267,  scores:{aroma:8.3,flavour:8.5,mouthfeel:8.1,finish:8.2}, topNotes:["Jasmine","Peach","Caramel"],       roaster:"Assembly",            verified:false },
  { id:"c11", name:"Stumptown Coffee",        city:"Portland",     country:"USA",       neighbourhood:"OR",             logs:241,  scores:{aroma:8.2,flavour:8.4,mouthfeel:8.0,finish:8.1}, topNotes:["Caramel","Hazelnut","Citrus"],     roaster:"Stumptown",           verified:true  },
  { id:"c12", name:"Café de Flore",           city:"Paris",        country:"France",    neighbourhood:"Saint-Germain",  logs:189,  scores:{aroma:7.8,flavour:8.0,mouthfeel:8.3,finish:7.9}, topNotes:["Caramel","Dark chocolate","Nutty"],roaster:"Local blend",         verified:false },
];

function cafeOverall(scores) {
  return fmt1((scores.aroma*0.25+scores.flavour*0.35+scores.mouthfeel*0.15+scores.finish*0.25));
}

const CAFE_TAGS = [
  "Good for working","Fast wifi","Quiet","Cozy","Outdoor seating","Great pastries",
  "Friendly staff","Spacious","Good for groups","Pet friendly","Natural light","Plenty of outlets",
];
const DRINK_TYPES = [
  {id:"espresso",label:"Espresso",icon:"☕"},{id:"filter",label:"Pour Over",icon:"🫗"},{id:"drip",label:"Drip",icon:"💧"},
  {id:"latte",label:"Latte",icon:"🥛"},{id:"cappuccino",label:"Cappuccino",icon:"☕"},
  {id:"cold_brew",label:"Cold Brew",icon:"🧊"},{id:"aeropress",label:"AeroPress",icon:"🔩"},
  {id:"moka",label:"Moka Pot",icon:"🫙"},{id:"french_press",label:"French Press",icon:"🟤"},
  {id:"cortado",label:"Cortado",icon:"🍵"},{id:"flat_white",label:"Flat White",icon:"⬜"},
  {id:"chemex",label:"Chemex",icon:"⚗️"},{id:"bean_to_cup",label:"Bean-to-Cup",icon:"⚙️"},
  {id:"keurig",label:"Keurig",icon:"📦"},
  {id:"nespresso",label:"Nespresso",icon:"💊"},
  {id:"other",label:"Other",icon:"✦"},
];
const ROAST_LEVELS = [
  {id:"light",label:"Light",desc:"Bright & fruity"},{id:"light_med",label:"Light–Med",desc:"Balanced"},
  {id:"medium",label:"Medium",desc:"Caramel & round"},{id:"med_dark",label:"Med–Dark",desc:"Bittersweet"},
  {id:"dark",label:"Dark",desc:"Bold & smoky"},
];
const PROCESS_METHODS = ["Washed","Natural","Honey","Anaerobic Natural","Anaerobic Washed","Extended Fermentation","Carbonic Maceration","Wet-Hulled","Experimental","Unknown"];
const ORIGINS = ["Ethiopia","Colombia","Brazil","Guatemala","Kenya","Costa Rica","El Salvador","Panama","Honduras","Peru","Rwanda","Burundi","Tanzania","Yemen","Indonesia","Vietnam","Jamaica","Hawaii","Nicaragua","Mexico","Blend"];
const BREW_METHODS = ["Espresso Machine","Moka Pot","AeroPress","V60 Pour Over","Chemex","French Press","Cold Brew","Siphon","Clever Dripper","Kalita Wave","Batch Brew","Bean-to-Cup","Keurig","Nespresso","Café","Other"];
// Sensible brew-time presets per method — espresso in seconds, pour-overs in minutes, cold brew in hours.
const TIME_PRESETS = {
  "Espresso Machine":["25s","28s","30s","32s","35s"],
  "Moka Pot":["3:00","4:00","5:00"],
  "AeroPress":["1:00","1:30","2:00","2:30"],
  "V60 Pour Over":["2:30","3:00","3:30","4:00"],
  "Chemex":["3:30","4:00","4:30","5:00"],
  "French Press":["4:00","5:00","6:00","8:00"],
  "Cold Brew":["12h","16h","18h","24h"],
  "Siphon":["1:30","2:00","2:30"],
  "Clever Dripper":["2:00","3:00","4:00"],
  "Kalita Wave":["2:30","3:00","3:30"],
  "Batch Brew":["4:00","5:00","6:00"],
  "Bean-to-Cup":["25s","30s","35s"],
};
const defaultTimePresets = ["30s","2:30","3:00","3:30","4:00"];
const GRINDERS = ["Comandante C40","1Zpresso JX-Pro","Niche Zero","Baratza Encore","Fellow Ode","Eureka Mignon","Mazzer Mini","Other hand grinder","Pre-ground","Other"];
const MACHINES = ["La Marzocco Linea Mini","Breville Barista Express","Rocket Appartamento","Rancilio Silvia","ECM Synchronika","Gaggia Classic Pro","AeroPress","Hario V60","Chemex","Moka Pot","De'Longhi Magnifica","De'Longhi La Specialista","Jura E8","Jura Z10","Sage Oracle","Sage Barista Touch","Melitta Barista","Miele CM6","Siemens EQ","Philips 3200","Keurig","Nespresso","Café machine","Other"];
const WATER_TYPES = ["Tap (filtered)","Tap (unfiltered)","Bottled still","Third Wave Water","Specialty water","Reverse osmosis","Spring water"];

const RECIPES = [
  { id:"v60",name:"V60 Pour Over",icon:"🫗",difficulty:"Intermediate",ratio:"1:16",time:"3–4 min",yield:"300ml",params:{Coffee:"18g",Water:"288ml",Temp:"93°C",Grind:"Medium-fine"},steps:["Rinse filter, preheat vessel, discard rinse.","Add 18g coffee. Bloom with 36ml for 45s.","Pour to 150ml in steady circles by 1:30.","Continue to 288ml in 2 more pours.","Allow full drawdown. Target ~3:30 total."] },
  { id:"espresso",name:"Espresso",icon:"☕",difficulty:"Advanced",ratio:"1:2",time:"25–30s",yield:"36ml",params:{Dose:"18g",Yield:"36ml",Temp:"93°C",Grind:"Fine"},steps:["Dial grind for 25–30s extraction.","Dose and distribute evenly in portafilter.","Tamp level with ~15kg pressure.","Lock in, start immediately.","Stop at 36ml. Adjust grind if off target."] },
  { id:"aeropress",name:"AeroPress",icon:"🔩",difficulty:"Beginner",ratio:"1:12",time:"2 min",yield:"200ml",params:{Coffee:"17g",Water:"200ml",Temp:"85°C",Grind:"Medium"},steps:["Set AeroPress inverted on scale.","Add 17g coffee, pour 200ml at 85°C.","Stir 10 times, cap with wet filter.","Steep 1:00 total. Flip onto cup.","Press slowly over 30 seconds."] },
  { id:"cold_brew",name:"Cold Brew",icon:"🧊",difficulty:"Beginner",ratio:"1:8",time:"16–24 hrs",yield:"800ml",params:{Coffee:"100g",Water:"800ml",Temp:"4°C fridge",Grind:"Coarse"},steps:["Coarse-grind 100g coffee.","Combine with 800ml cold water.","Stir gently to saturate all grounds.","Cover and steep in fridge 16–24 hours.","Strain through filter. Dilute 1:1 to serve."] },
  { id:"french_press",name:"French Press",icon:"🟤",difficulty:"Beginner",ratio:"1:15",time:"4 min",yield:"450ml",params:{Coffee:"30g",Water:"450ml",Temp:"94°C",Grind:"Coarse"},steps:["Preheat press, discard water.","Add 30g coarse coffee.","Pour 450ml at 94°C, stir briefly.","Lid on, do not plunge. Steep 4 min.","Press slowly. Pour immediately."] },
  { id:"moka",name:"Moka Pot",icon:"🫙",difficulty:"Intermediate",ratio:"1:7",time:"5–7 min",yield:"60ml",params:{Coffee:"15g",Water:"105ml",Temp:"Med heat",Grind:"Fine-medium"},steps:["Fill bottom with boiling water to valve.","Add 15g coffee, do not tamp.","Assemble tightly, place on medium-low heat.","Keep lid open, watch for steady stream.","Remove at gurgling. Cool base under tap."] },
];

const SAMPLE_USERS = [{id:"u1",name:"Marta V.",avatar:"M",entries:84},{id:"u2",name:"James O.",avatar:"J",entries:212}];

const SAMPLE_ENTRIES = [
  { id:1,userId:"me",type:"home",drinkType:"espresso",name:"Yirgacheffe Natural",roaster:"Square Mile Coffee",origin:"Ethiopia",process:"Natural",roastLevel:"light",method:"Espresso Machine",grinder:"Niche Zero",machine:"Rocket Appartamento",water:"Third Wave Water",waterTemp:93,coffeeGrams:30,yieldGrams:480,extractionTime:240,grindSetting:"3.1",roastDate:"2026-05-25",scores:{aroma:9,flavour:9,mouthfeel:8,finish:9},isPublic:true,notes:"Incredible blueberry jam on the nose. Smooth body, long finish.",tastingNotes:["Blueberry","Dark chocolate","Jasmine"],date:"2026-06-04" },
  { id:2,userId:"u2",type:"cafe",drinkType:"filter",name:"Kenya AA Kirinyaga",roaster:"Onyx Coffee Lab",origin:"Kenya",process:"Washed",roastLevel:"light",method:"Café",scores:{aroma:8,flavour:8,mouthfeel:7,finish:7},isPublic:true,notes:"Bright, wine-like acidity. Blackcurrant and citrus.",tastingNotes:["Citrus","Cherry","Black tea"],cafeName:"Workshop Coffee",cafeLocation:"London, UK",date:"2026-06-02" },
  { id:3,userId:"me",type:"home",drinkType:"filter",name:"Colombia Gesha Las Flores",roaster:"Gardelli Specialty",origin:"Colombia",process:"Anaerobic Natural",roastLevel:"light",method:"V60 Pour Over",grinder:"Comandante C40",water:"Specialty water",waterTemp:92,coffeeGrams:18,yieldGrams:288,roastDate:"2026-05-15",scores:{aroma:10,flavour:9,mouthfeel:8,finish:9},isPublic:true,notes:"Jasmine, peach tea, honey. Ethereal and delicate.",tastingNotes:["Jasmine","Peach","Honey","Rose"],date:"2026-05-30" },
  { id:4,userId:"u1",type:"home",drinkType:"aeropress",name:"Guatemala Huehuetenango",roaster:"Onyx Coffee Lab",origin:"Guatemala",process:"Washed",roastLevel:"medium",method:"AeroPress",grinder:"1Zpresso JX-Pro",water:"Tap (filtered)",waterTemp:88,coffeeGrams:17,yieldGrams:200,scores:{aroma:7,flavour:8,mouthfeel:7,finish:7},isPublic:true,notes:"Solid everyday drinker. Milk chocolate, hazelnut, gentle citrus.",tastingNotes:["Milk chocolate","Hazelnut","Citrus"],date:"2026-06-01" },
  { id:5,userId:"me",type:"cafe",drinkType:"filter",name:"Rwanda Nyamasheke",roaster:"Tim Wendelboe",origin:"Rwanda",process:"Washed",roastLevel:"light",method:"Café",scores:{aroma:9,flavour:9,mouthfeel:8,finish:10},isPublic:true,notes:"Peach, hibiscus, gentle jasmine. Incredibly clean finish.",tastingNotes:["Peach","Jasmine","Citrus","Rose"],cafeName:"Fuglen Tokyo",cafeLocation:"Tokyo, Japan",date:"2026-05-28" },
  { id:6,userId:"me",type:"home",drinkType:"espresso",name:"Ethiopia Anaerobic Natural",roaster:"Proud Mary Coffee",origin:"Ethiopia",process:"Anaerobic Natural",roastLevel:"light",method:"Espresso Machine",grinder:"Niche Zero",machine:"Rocket Appartamento",water:"Third Wave Water",waterTemp:92,coffeeGrams:18,yieldGrams:36,extractionTime:25,scores:{aroma:8,flavour:9,mouthfeel:7,finish:8},isPublic:false,notes:"Tropical fruit bomb. Mango and strawberry dominant.",tastingNotes:["Mango","Strawberry","Honey","Elderflower"],date:"2026-05-22" },
  { id:7,userId:"me",type:"home",drinkType:"filter",name:"Panama Gesha La Esmeralda",roaster:"Square Mile Coffee",origin:"Panama",process:"Washed",roastLevel:"light",method:"Chemex",grinder:"Comandante C40",water:"Third Wave Water",waterTemp:93,coffeeGrams:30,yieldGrams:480,scores:{aroma:10,flavour:10,mouthfeel:8,finish:9},isPublic:true,notes:"Floral beyond belief. Jasmine, white peach, bergamot. Transcendent.",tastingNotes:["Jasmine","Peach","Elderflower","Citrus"],date:"2026-05-18" },
  { id:8,userId:"me",type:"cafe",drinkType:"latte",name:"House Blend",roaster:"Assembly Coffee",origin:"Colombia",process:"Washed",roastLevel:"medium",method:"Espresso Machine",scores:{aroma:6,flavour:6,mouthfeel:7,finish:5},isPublic:false,notes:"Decent everyday latte. Nothing special but reliable.",tastingNotes:["Caramel","Milk chocolate","Hazelnut"],cafeName:"Assembly Coffee",cafeLocation:"London, UK",date:"2026-05-15" },
];

const fmt1 = n => Math.round(n*10)/10;
const fmtDate = d => new Date(d).toLocaleDateString("en-US",{month:"short",day:"numeric",year:"numeric"});
const drinkInfo = id => DRINK_TYPES.find(d=>d.id===id);
const drinkLabel = entry => {
  if(!entry) return "";
  if(entry.drinkType==="other") return entry.customDrinkType||"Other";
  const d=DRINK_TYPES.find(x=>x.id===entry.drinkType);
  return d?d.label:"";
};
const roastInfo = id => ROAST_LEVELS.find(r=>r.id===id);

function groupNotes(notes=[]) {
  const g={};
  notes.forEach(n=>{ const f=NOTE_TO_FAM[n]||"Other"; if(!g[f])g[f]=[]; g[f].push(n); });
  return g;
}
function buildPalateProfile(entries) {
  const raw={}; FAM_KEYS.forEach(k=>raw[k]=0);
  entries.forEach(e=>{ const w=overallFromEntry(e)||3; (e.tastingNotes||[]).forEach(n=>{ const f=NOTE_TO_FAM[n]; if(f)raw[f]+=w; }); });
  const max=Math.max(...Object.values(raw),1);
  return Object.fromEntries(FAM_KEYS.map(k=>[k,Math.round((raw[k]/max)*10)]));
}
function matchScore(profile,target) {
  let dot=0,magA=0,magB=0;
  FAM_KEYS.forEach(k=>{ dot+=(profile[k]||0)*(target[k]||0); magA+=(profile[k]||0)**2; magB+=(target[k]||0)**2; });
  if(!magA||!magB) return 0;
  return Math.round((dot/(Math.sqrt(magA)*Math.sqrt(magB)))*100);
}

// Match a roaster by scoring each of its beans and returning best + avg
function matchRoaster(userProfile, roaster) {
  if(!roaster.beans||!roaster.beans.length) return { best:0, avg:0, bestBean:null };
  const scores = roaster.beans.map(b=>({ ...b, score:matchScore(userProfile, b.profile) }))
    .sort((a,b)=>b.score-a.score);
  const avg = Math.round(scores.reduce((s,b)=>s+b.score,0)/scores.length);
  return { best:scores[0].score, avg, bestBean:scores[0], allBeans:scores };
}

// ─── WORDMARK ─────────────────────────────────────────────────────────────────
// Alfa Slab One, ink-dominant, drop shadow like Colson logo
// Blue and pink are UI accents only — not in the wordmark itself
function TileWordmark({ size="md" }) {
  const fontSize = size==="lg" ? 38 : size==="sm" ? 19 : 23;
  return (
    <div style={{
      fontFamily:"'Fraunces',serif",
      fontSize:fontSize,
      fontWeight:400,
      fontStyle:"italic",
      color:"var(--ink)",
      letterSpacing:"-0.5px",
      lineHeight:1,
      userSelect:"none",
    }}>
      Million Coffees
    </div>
  );
}

// ─── RADAR CHART ──────────────────────────────────────────────────────────────
function RadarChart({ profile, compareProfile=null, size=230 }) {
  const cx=size/2, cy=size/2+8, r=size*0.34;
  const angle=i=>(Math.PI*2*i/FAM_KEYS.length)-Math.PI/2;
  const pt=(i,val)=>{ const a=angle(i),frac=(val||0)/10; return [cx+Math.cos(a)*r*frac,cy+Math.sin(a)*r*frac]; };
  const gridPt=(i,frac)=>[cx+Math.cos(angle(i))*r*frac,cy+Math.sin(angle(i))*r*frac];
  const poly=p=>FAM_KEYS.map((k,i)=>pt(i,p[k]||0).join(",")).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} style={{display:"block",margin:"0 auto"}}>
      {[0.25,0.5,0.75,1].map(f=><polygon key={f} points={FAM_KEYS.map((_,i)=>gridPt(i,f).join(",")).join(" ")} fill="none" stroke="#d0c8b0" strokeWidth={f===1?"1.5":"1"}/>)}
      {FAM_KEYS.map((_,i)=><line key={i} x1={cx} y1={cy} x2={gridPt(i,1)[0]} y2={gridPt(i,1)[1]} stroke="#d0c8b0" strokeWidth="1"/>)}
      {compareProfile&&<polygon points={poly(compareProfile)} fill="rgba(45,90,56,0.1)" stroke="#2d5a38" strokeWidth="1.5" strokeLinejoin="round" strokeDasharray="4,3"/>}
      <polygon points={poly(profile)} fill="rgba(58,120,184,0.15)" stroke="#1a2f5e" strokeWidth="2" strokeLinejoin="round"/>
      {FAM_KEYS.map((k,i)=>{ const [x,y]=pt(i,profile[k]||0); return <circle key={k} cx={x} cy={y} r="3.5" fill="#3a78b8" stroke="#1a2f5e" strokeWidth="1"/>; })}
      {FAM_KEYS.map((k,i)=>{
        const a=angle(i), lx=cx+Math.cos(a)*(r+22), ly=cy+Math.sin(a)*(r+22);
        const def=NOTE_FAMILIES[k];
        return <g key={k}>
          <text x={lx} y={ly-4} textAnchor="middle" fontSize="9" fontFamily="Inter,sans-serif" fill={def.color} letterSpacing="0.8" fontWeight="600">{k.toUpperCase()}</text>
          <text x={lx} y={ly+9} textAnchor="middle" fontSize="10" fontFamily="DM Mono,monospace" fill="#7a6a50">{profile[k]||0}/10</text>
        </g>;
      })}
      {compareProfile&&<g>
        <circle cx={cx-28} cy={size-10} r="4" fill="rgba(45,90,56,0.4)" stroke="#2d5a38" strokeWidth="1"/>
        <text x={cx-20} y={size-6} fontSize="9" fontFamily="Inter,sans-serif" fill="#2d5a38">Roaster</text>
        <circle cx={cx+22} cy={size-10} r="4" fill="rgba(58,120,184,0.4)" stroke="#1a2f5e" strokeWidth="1"/>
        <text x={cx+30} y={size-6} fontSize="9" fontFamily="Inter,sans-serif" fill="#1a2f5e">You</text>
      </g>}
    </svg>
  );
}

function FamilyBar({ family, value }) {
  const def=NOTE_FAMILIES[family];
  return (
    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:6}}>
      <div style={{width:50,fontSize:10,color:def.color,fontFamily:"'Inter',sans-serif",letterSpacing:"0.5px",fontWeight:500,flexShrink:0}}>{family}</div>
      <div style={{flex:1,height:5,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
        <div style={{height:"100%",width:`${(value/10)*100}%`,background:def.color,borderRadius:3,opacity:0.85}}/>
      </div>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"var(--ink3)",width:24,textAlign:"right"}}>{value}</div>
    </div>
  );
}

// Score display components
function ScoreDisplay({ scores, size="md" }) {
  if(!scores) return null;
  const overall=computeOverall(scores);
  const isSm=size==="sm";
  return (
    <div style={{display:"flex",gap:6,alignItems:"center",flexWrap:"wrap"}}>
      <div style={{fontSize:isSm?26:32,color:"var(--accent)",lineHeight:1,fontWeight:300,fontFamily:"'Fraunces',serif",letterSpacing:"-0.5px"}}>{overall.toFixed(1)}</div>
      <div style={{fontSize:isSm?9:10,color:"var(--ink3)",fontFamily:"'DM Mono',monospace",lineHeight:1}}>/10</div>
      {!isSm&&<div style={{display:"flex",gap:4,marginLeft:4}}>
        {RATING_DIMS.map(d=>(
          <div key={d.id} style={{textAlign:"center"}}>
            <div style={{width:26,height:26,borderRadius:6,background:`${DIM_COLORS[d.id]}18`,border:`1.5px solid ${DIM_COLORS[d.id]}50`,display:"flex",alignItems:"center",justifyContent:"center"}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:DIM_COLORS[d.id],fontWeight:500}}>{scores[d.id]||"–"}</span>
            </div>
            <div style={{fontSize:8,color:"var(--ink3)",marginTop:2,fontFamily:"'DM Mono',monospace"}}>{d.label.slice(0,3).toUpperCase()}</div>
          </div>
        ))}
      </div>}
    </div>
  );
}

function DimScoreCard({ scores }) {
  if(!scores) return null;
  const overall=computeOverall(scores);
  return (
    <div style={{background:"var(--surface)",borderRadius:"var(--r)",border:"1.5px solid var(--border)",padding:"14px 16px"}}>
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
        <div>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:15,color:"var(--ink)",marginBottom:2}}>Overall Score</div>
          <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Fraunces',serif"}}>Weighted across 4 dimensions</div>
        </div>
        <div style={{fontSize:40,color:"var(--accent)",lineHeight:1,fontWeight:300,fontFamily:"'Fraunces',serif",letterSpacing:"-1px"}}>{overall.toFixed(1)}<span style={{fontSize:16,color:"var(--ink3)"}}>/10</span></div>
      </div>
      {RATING_DIMS.map(d=>(
        <div key={d.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
          <div style={{width:64,fontSize:11,color:DIM_COLORS[d.id],fontFamily:"'Inter',sans-serif",fontWeight:500,flexShrink:0}}>{d.label}</div>
          <div style={{flex:1,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
            <div style={{height:"100%",width:`${((scores[d.id]||0)/10)*100}%`,background:DIM_COLORS[d.id],borderRadius:3,opacity:0.85}}/>
          </div>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:16,color:DIM_COLORS[d.id],width:30,textAlign:"right",fontWeight:600}}>{scores[d.id]!=null?Number(scores[d.id]).toFixed(1):"–"}</div>
        </div>
      ))}
      <div style={{marginTop:8,fontSize:11,color:"var(--ink3)",fontFamily:"'Fraunces',serif",fontStyle:"italic"}}>Weights: Flavour 35% · Aroma 25% · Finish 25% · Mouthfeel 15%</div>
    </div>
  );
}

function RatingInput({ scores, onChange }) {
  return (
    <div>
      {RATING_DIMS.map(d=>{
        const val=scores[d.id]||0;
        return (
          <div key={d.id} style={{marginBottom:18}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"baseline",marginBottom:7}}>
              <div>
                <span style={{fontSize:13,color:"var(--ink)",fontFamily:"'Inter',sans-serif",fontWeight:500}}>{d.label}</span>
                <span style={{fontSize:11,color:"var(--ink3)",marginLeft:6,fontFamily:"'Fraunces',serif"}}>{d.desc}</span>
              </div>
              <span style={{fontFamily:"'Inter',sans-serif",fontSize:20,color:val?DIM_COLORS[d.id]:"var(--ink3)",fontWeight:val?600:400,minWidth:24,textAlign:"right"}}>{val||"–"}</span>
            </div>
            <div style={{display:"flex",gap:4}}>
              {[1,2,3,4,5,6,7,8,9,10].map(n=>(
                <button key={n} onClick={()=>onChange({...scores,[d.id]:val===n?0:n})}
                  style={{flex:1,padding:"7px 0",border:`1.5px solid ${n<=val?DIM_COLORS[d.id]:"var(--border2)"}`,borderRadius:6,background:n<=val?`${DIM_COLORS[d.id]}15`:"var(--surface)",color:n<=val?DIM_COLORS[d.id]:"var(--ink3)",fontFamily:"'DM Mono',monospace",fontSize:11,cursor:"pointer",transition:"all 0.1s",fontWeight:n<=val?"600":"400"}}>
                  {n}
                </button>
              ))}
            </div>
          </div>
        );
      })}
      {RATING_DIMS.every(d=>scores[d.id])&&(
        <div style={{background:"var(--amber-light)",border:"1.5px solid var(--amber)",borderRadius:"var(--rsm)",padding:"10px 12px",marginTop:4}}>
          <div style={{fontFamily:"'Inter',sans-serif",fontSize:15,color:"#5a3800"}}>Overall: {computeOverall(scores).toFixed(1)} / 10</div>
          <div style={{fontSize:11,color:"var(--ink3)",marginTop:2,fontFamily:"'Fraunces',serif"}}>Weighted composite</div>
        </div>
      )}
    </div>
  );
}

// ─── STYLES ───────────────────────────────────────────────────────────────────
const S = `
*{box-sizing:border-box;margin:0;padding:0;-webkit-tap-highlight-color:transparent;}
:root{
  --bg:#EDE7DC;
  --surface:#F4EFE6;
  --surface2:#E7E0D3;
  --border:#DDD5C7;
  --border2:#CFC6B4;
  --ink:#1C1814;
  --ink2:#6B6256;
  --ink3:#A8A092;
  --accent:#A85436;
  --accent-soft:#E3D2C8;
  /* legacy aliases mapped to the new system so old refs still resolve */
  --navy:#1C1814;
  --blue:#A85436;
  --blue-light:#E3D2C8;
  --rose:#A85436;
  --rose-light:#E3D2C8;
  --amber:#A85436;
  --amber-light:#E3D2C8;
  --sage:#A85436;
  --sage-light:#E3D2C8;
  --serif:'Fraunces',Georgia,serif;
  --sans:'Inter',system-ui,sans-serif;
  --mono:'DM Mono',monospace;
  --r:10px;
  --rsm:6px;
}
body{background:var(--bg);font-family:'Inter',sans-serif;color:var(--ink);min-height:100vh;}
.app{max-width:480px;margin:0 auto;background:var(--bg);min-height:100vh;}

/* HEADER — cream with ink wordmark */
.hdr{background:var(--bg);padding:0;position:sticky;top:0;z-index:100;border-bottom:none;}
.hdr-plaque{padding:24px 26px 0;}
.hdr-top{display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;}
.hdr-r{display:flex;align-items:center;gap:10px;}
.hdr-count{font-family:'DM Mono',monospace;font-size:11px;color:var(--ink3);letter-spacing:0.5px;}
.av-btn{width:34px;height:34px;border-radius:50%;background:none;border:1px solid var(--line);color:var(--ink2);font-size:13px;font-weight:500;display:flex;align-items:center;justify-content:center;cursor:pointer;font-family:'Inter',sans-serif;}
.sign-btn{background:none;border:1px solid var(--line);border-radius:0;padding:7px 14px;font-size:12px;color:var(--ink2);cursor:pointer;font-family:'Inter',sans-serif;letter-spacing:0.5px;text-transform:uppercase;}

/* TILE BORDER STRIP */
.tile-border{display:none;}

/* NAV — blue underline for active tab only */
.nav{display:flex;align-items:flex-end;gap:0;border-top:none;border-bottom:1px solid var(--line);padding:0;}
.ntab{padding:0 0 12px;margin-right:22px;background:none;border:none;color:var(--ink3);font-family:'Inter',sans-serif;font-size:14px;font-weight:400;letter-spacing:0;cursor:pointer;transition:color 0.18s;display:inline-block;position:relative;white-space:nowrap;}
.ntab.active{color:var(--ink);font-weight:600;}
.ntab.active::after{content:"";position:absolute;bottom:-1px;left:0;right:22px;height:2px;background:var(--accent);}
.nav-divider{width:1px;align-self:stretch;background:var(--line);margin:0 16px 12px 0;}

.content{padding:0 26px 100px;}
.screen-eyebrow{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;font-weight:500;font-family:'Inter',sans-serif;padding:22px 0 0;}
.screen-eyebrow.inward{color:var(--ink3);}
.screen-eyebrow.outward{color:var(--accent);}
.community-wrap{margin:-16px -16px 0;padding:0 26px 100px;}

/* FILTER CHIPS */
.filter-row{display:flex;gap:8px;margin-bottom:8px;overflow-x:auto;padding:14px 0 6px;scrollbar-width:none;}
.filter-row::-webkit-scrollbar{display:none;}
.fchip{padding:7px 0;border:none;border-bottom:1.5px solid transparent;background:none;font-size:13px;color:var(--ink3);cursor:pointer;white-space:nowrap;transition:all 0.15s;font-family:'Inter',sans-serif;margin-right:4px;}
.fchip.active{background:none;color:var(--accent);border-bottom-color:var(--accent);font-weight:500;}

/* ENTRY CARDS */
.ecard{background:none;border:none;border-bottom:1px solid var(--line);border-radius:0;margin-bottom:0;overflow:hidden;cursor:pointer;transition:opacity 0.15s;}
.ecard:active{opacity:0.6;}
.ecard-inner{padding:20px 0;}
.ecard-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}
.ecard-left{flex:1;min-width:0;}
.ecard-meta{display:flex;align-items:center;gap:6px;margin-bottom:7px;flex-wrap:wrap;}
.badge{display:inline-flex;align-items:center;padding:0;font-family:'Inter',sans-serif;font-size:10px;letter-spacing:1.5px;text-transform:uppercase;font-weight:500;}
.badge-home{background:none;color:var(--ink3);}
.badge-cafe{background:none;color:var(--accent);}
.badge-pub{background:var(--amber-light);color:#6b4a00;}
.ecard-name{font-family:'Fraunces',serif;font-size:20px;font-weight:400;color:var(--ink);line-height:1.2;margin-bottom:4px;}
.ecard-sub{font-size:13px;color:var(--ink2);line-height:1.4;font-family:'Inter',sans-serif;}
.ecard-r{display:flex;flex-direction:column;align-items:flex-end;gap:6px;flex-shrink:0;}
.ecard-date{font-family:'DM Mono',monospace;font-size:10px;color:var(--ink3);}
.user-line{display:flex;align-items:center;gap:5px;font-size:11px;color:var(--ink3);margin-top:6px;font-family:'Inter',sans-serif;}
.user-dot{width:18px;height:18px;border-radius:50%;background:var(--surface2);color:var(--ink3);font-size:9px;display:flex;align-items:center;justify-content:center;font-weight:600;}
.card-sep{height:1px;background:var(--border);margin:0 16px;}
.card-notes-row{padding:10px 16px 14px;display:flex;flex-wrap:wrap;gap:5px;}
.npill{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:11px;font-family:'Inter',sans-serif;letter-spacing:0.2px;}
.card-quote{padding:0 16px 14px;font-family:'Fraunces',serif;font-size:15px;font-style:italic;color:var(--ink2);line-height:1.5;}

/* FAB — pink, used ONLY here */
.fab{position:fixed;bottom:24px;left:50%;transform:translateX(-50%);width:calc(100% - 32px);max-width:448px;background:var(--rose);color:#fff;border:none;border-radius:12px;padding:15px;font-family:'Fraunces',serif;font-size:18px;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:8px;box-shadow:0 4px 20px rgba(201,123,132,0.4);z-index:50;transition:all 0.15s;letter-spacing:0.3px;}
.fab:active{transform:translateX(-50%) scale(0.97);}

/* MODAL */
.overlay{position:fixed;inset:0;background:rgba(26,18,8,0.45);z-index:200;display:flex;align-items:flex-end;justify-content:center;backdrop-filter:blur(4px);}
.modal{background:var(--bg);width:100%;max-width:480px;border-radius:18px 18px 0 0;max-height:93vh;overflow-y:auto;animation:up 0.28s cubic-bezier(0.32,0.72,0,1);}
@keyframes up{from{transform:translateY(100%)}to{transform:translateY(0)}}
.modal-handle{width:40px;height:3px;background:var(--border);border-radius:2px;margin:12px auto 0;}
.modal-hdr{padding:16px 20px 14px;display:flex;justify-content:space-between;align-items:center;border-bottom:1.5px solid var(--border);}
.modal-title{font-family:'Fraunces',serif;font-size:20px;color:var(--ink);}
.close-btn{background:var(--border);border:none;border-radius:50%;width:30px;height:30px;font-size:14px;cursor:pointer;color:var(--ink2);display:flex;align-items:center;justify-content:center;}
.modal-body{padding:18px 20px 32px;}

/* FORM */
.fsec{margin-bottom:22px;}
.fsec-title{font-family:'Inter',sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:11px;padding-bottom:7px;border-bottom:1.5px solid var(--border);font-weight:500;}
.flabel{font-size:12px;color:var(--ink2);margin-bottom:5px;display:block;font-family:'Fraunces',serif;}
.fgrp{margin-bottom:12px;}
.finput{width:100%;padding:11px 0;background:none;border:none;border-bottom:1px solid var(--line);border-radius:0;font-family:'Inter',sans-serif;font-size:16px;color:var(--ink);outline:none;transition:border-color 0.15s;-webkit-appearance:none;appearance:none;}
.finput:focus{border-bottom-color:var(--accent);}
.finput:focus{border-color:var(--navy);}
textarea.finput{resize:vertical;min-height:80px;line-height:1.5;}
.chip-grid{display:flex;flex-wrap:wrap;gap:7px;}
.chip{padding:6px 13px;border-radius:20px;border:1.5px solid var(--border);background:var(--surface);font-family:'Inter',sans-serif;font-size:13px;color:var(--ink2);cursor:pointer;transition:all 0.14s;letter-spacing:0.2px;}
.chip.sel{background:var(--navy);border-color:var(--navy);color:#fff;}
.two-col{display:grid;grid-template-columns:1fr 1fr;gap:10px;}
.slider-row{display:flex;align-items:center;gap:10px;}
input[type=range]{flex:1;-webkit-appearance:none;appearance:none;height:3px;border-radius:2px;background:linear-gradient(to right,var(--navy) 0%,var(--navy) var(--v,50%),var(--border) var(--v,50%));outline:none;}
input[type=range]::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;border-radius:50%;background:var(--surface);border:2px solid var(--navy);cursor:pointer;box-shadow:0 1px 4px rgba(0,0,0,0.1);}
.slider-val{font-family:'DM Mono',monospace;font-size:12px;color:var(--ink2);min-width:38px;text-align:right;}
.tgl-row{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid var(--border);}
.tgl-label{font-size:14px;color:var(--ink);font-family:'Fraunces',serif;}
.tgl-sub{font-size:11px;color:var(--ink3);margin-top:1px;font-family:'Fraunces',serif;}
.tgl{width:42px;height:25px;background:var(--border);border-radius:13px;position:relative;cursor:pointer;transition:background 0.18s;border:none;flex-shrink:0;}
.tgl.on{background:var(--navy);}
.tgl::after{content:'';position:absolute;width:19px;height:19px;background:white;border-radius:50%;top:3px;left:3px;transition:transform 0.18s;box-shadow:0 1px 3px rgba(0,0,0,0.15);}
.tgl.on::after{transform:translateX(17px);}
.pub-row{background:var(--surface2);border-radius:var(--rsm);padding:12px 14px;display:flex;justify-content:space-between;align-items:center;border:1.5px solid var(--border);margin-bottom:20px;}
.pub-text{font-size:14px;color:var(--ink);font-weight:500;font-family:'Inter',sans-serif;}
.pub-sub{font-size:11px;color:var(--ink3);margin-top:2px;font-family:'Fraunces',serif;}
/* Submit btn — navy, not pink */
.sub-btn{width:100%;padding:14px;background:var(--navy);color:#fff;border:none;border-radius:var(--r);font-family:'Fraunces',serif;font-size:18px;cursor:pointer;margin-top:10px;transition:opacity 0.15s;letter-spacing:0.3px;box-shadow:0 3px 12px rgba(26,47,94,0.25);}
.sub-btn:active{opacity:0.85;}

/* DETAIL */
.det-wrap{background:var(--bg);min-height:100vh;}
.det-hdr{background:var(--surface);padding:16px 20px 18px;border-bottom:4px solid var(--amber);}
.back-btn{display:inline-flex;align-items:center;gap:4px;background:var(--surface2);border:1.5px solid var(--border);border-radius:20px;color:var(--ink2);font-size:12px;cursor:pointer;margin-bottom:14px;padding:5px 12px;font-family:'Inter',sans-serif;letter-spacing:0.3px;}
.det-title{font-family:'Fraunces',serif;font-size:24px;color:var(--ink);line-height:1.2;margin-bottom:4px;}
.det-roaster{font-size:13px;color:var(--ink3);margin-bottom:10px;font-family:'Fraunces',serif;}
.det-body{padding:18px 20px 80px;}
.dsec{margin-bottom:20px;}
.dsec-title{font-family:'Inter',sans-serif;font-size:10px;letter-spacing:2px;text-transform:uppercase;color:var(--ink3);margin-bottom:10px;font-weight:500;}
.dgrid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.ditem{background:var(--surface);border-radius:var(--rsm);padding:10px 12px;border:1.5px solid var(--border);}
.ditem-l{font-size:10px;color:var(--ink3);text-transform:uppercase;letter-spacing:0.5px;margin-bottom:3px;font-family:'DM Mono',monospace;}
.ditem-v{font-size:14px;color:var(--ink);font-family:'Inter',sans-serif;font-weight:500;}
.quote-block{background:var(--surface);border-radius:var(--r);padding:14px 16px;font-family:'Fraunces',serif;font-size:16px;font-style:italic;color:var(--ink2);line-height:1.6;border:1.5px solid var(--border);border-left:4px solid var(--navy);}
.fam-row{margin-bottom:10px;}
.fam-label{font-size:10px;font-weight:600;letter-spacing:0.8px;text-transform:uppercase;margin-bottom:5px;font-family:'Inter',sans-serif;}
.fam-pills{display:flex;flex-wrap:wrap;gap:5px;}
.user-credit{display:flex;align-items:center;gap:10px;padding:12px;background:var(--surface);border-radius:var(--rsm);border:1.5px solid var(--border);}
.user-av{width:34px;height:34px;border-radius:50%;background:var(--surface2);color:var(--ink2);font-size:13px;display:flex;align-items:center;justify-content:center;font-weight:600;flex-shrink:0;font-family:'Inter',sans-serif;border:1.5px solid var(--border);}

/* RECIPES */
.rec-grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-bottom:20px;}
.rec-card{background:var(--surface);border-radius:var(--r);padding:14px;border:1.5px solid var(--border);cursor:pointer;transition:all 0.15s;box-shadow:0 2px 8px rgba(26,18,8,0.05);}
.rec-card:active{transform:scale(0.97);}
.rec-icon{font-size:26px;margin-bottom:8px;display:block;}
.rec-name{font-family:'Fraunces',serif;font-size:15px;color:var(--ink);margin-bottom:4px;}
.rec-meta{font-size:11px;color:var(--ink3);line-height:1.4;font-family:'Fraunces',serif;}
.rec-diff{display:inline-block;padding:2px 9px;background:var(--surface2);border:1px solid var(--border);border-radius:20px;font-size:10px;color:var(--ink3);margin-top:7px;font-family:'Inter',sans-serif;letter-spacing:0.3px;}
.rec-step{display:flex;gap:11px;padding:11px 0;border-bottom:1px solid var(--border);align-items:flex-start;}
.step-num{width:24px;height:24px;background:var(--navy);color:#fff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-family:'Inter',sans-serif;font-size:11px;font-weight:700;flex-shrink:0;margin-top:1px;}
.step-txt{font-size:14px;color:var(--ink2);line-height:1.5;font-family:'Fraunces',serif;}
.rec-params{display:grid;grid-template-columns:1fr 1fr;gap:7px;margin-bottom:18px;}

/* STATS */
.stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:16px;}
.stat-card{background:var(--surface);border-radius:var(--r);padding:14px;border:1.5px solid var(--border);box-shadow:0 2px 8px rgba(26,18,8,0.05);}
.stat-big{font-family:'Fraunces',serif;font-size:34px;color:var(--ink);line-height:1;}
.stat-desc{font-size:10px;color:var(--ink3);text-transform:uppercase;letter-spacing:0.6px;margin-top:3px;font-family:'Inter',sans-serif;}
.bar-card{background:var(--surface);border-radius:var(--r);padding:15px;margin-bottom:10px;border:1.5px solid var(--border);box-shadow:0 2px 8px rgba(26,18,8,0.04);}
.bar-card-title{font-family:'Fraunces',serif;font-size:16px;color:var(--ink);margin-bottom:3px;}
.bar-card-sub{font-size:11px;color:var(--ink3);margin-bottom:12px;line-height:1.4;font-family:'Fraunces',serif;font-style:italic;}
.bar-row{display:flex;align-items:center;gap:9px;margin-bottom:7px;}
.bar-lbl{font-size:11px;color:var(--ink3);width:78px;text-align:right;flex-shrink:0;font-family:'Fraunces',serif;}
.bar-track{flex:1;height:5px;background:var(--border);border-radius:3px;overflow:hidden;}
.bar-fill{height:100%;background:var(--navy);border-radius:3px;opacity:0.75;}
.bar-n{font-family:'DM Mono',monospace;font-size:10px;color:var(--ink3);min-width:16px;}
.radar-card{background:var(--surface);border-radius:var(--r);padding:18px 14px;margin-bottom:12px;border:1.5px solid var(--border);}
.radar-title{font-family:'Fraunces',serif;font-size:17px;color:var(--ink);margin-bottom:3px;}
.radar-sub{font-size:11px;color:var(--ink3);margin-bottom:14px;line-height:1.5;font-family:'Fraunces',serif;font-style:italic;}
.insight-banner{background:var(--surface2);border:1.5px solid var(--border);border-left:4px solid var(--navy);border-radius:var(--r);padding:14px 16px;margin-bottom:10px;}
.insight-title{font-family:'Fraunces',serif;font-size:16px;color:var(--ink);margin-bottom:4px;}
.insight-body{font-size:13px;color:var(--ink2);line-height:1.5;font-family:'Fraunces',serif;}
.rec-bean-card{background:var(--surface);border-radius:var(--r);border:1.5px solid var(--border);padding:14px 16px;margin-bottom:10px;}
.rec-bean-top{display:flex;justify-content:space-between;align-items:flex-start;gap:10px;}
.rec-bean-name{font-family:'Fraunces',serif;font-size:17px;color:var(--ink);margin-bottom:3px;}
.rec-bean-sub{font-size:12px;color:var(--ink3);font-family:'Fraunces',serif;}
.match-badge{background:var(--navy);border-radius:10px;padding:5px 11px;text-align:center;flex-shrink:0;}
.match-pct{font-family:'Fraunces',serif;font-size:19px;color:#fff;line-height:1;}
.match-lbl{font-family:'DM Mono',monospace;font-size:9px;color:rgba(255,255,255,0.55);letter-spacing:0.5px;}
.rec-bean-why{font-size:12px;color:var(--ink2);margin-top:8px;line-height:1.5;padding-top:8px;border-top:1px solid var(--border);font-family:'Fraunces',serif;font-style:italic;}
.rec-bean-families{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}

/* ROASTERS */
.roaster-search{width:100%;padding:11px 14px 11px 40px;background:var(--surface);border:1.5px solid var(--border);border-radius:10px;font-family:'Fraunces',serif;font-size:14px;color:var(--ink);outline:none;-webkit-appearance:none;appearance:none;}
.roaster-search:focus{border-color:var(--navy);}
.search-wrap{position:relative;margin-bottom:12px;}
.search-icon{position:absolute;left:14px;top:50%;transform:translateY(-50%);font-size:15px;color:var(--ink3);}
.roaster-card{background:var(--surface);border-radius:var(--r);border:1.5px solid var(--border);padding:14px 16px;margin-bottom:10px;cursor:pointer;transition:all 0.15s;}
.roaster-card:active{transform:scale(0.98);}
.roaster-top{display:flex;justify-content:space-between;align-items:flex-start;gap:8px;}
.roaster-name{font-family:'Fraunces',serif;font-size:17px;color:var(--ink);margin-bottom:2px;}
.roaster-loc{font-size:12px;color:var(--ink3);font-family:'Fraunces',serif;}
.roaster-right{display:flex;flex-direction:column;align-items:flex-end;gap:4px;flex-shrink:0;}
.roaster-rating{font-size:12px;color:var(--ink2);font-family:'DM Mono',monospace;}
.verified-badge{background:var(--sage-light);color:var(--sage);border:1px solid #a0c890;border-radius:20px;padding:2px 9px;font-family:'Inter',sans-serif;font-size:10px;}
.roaster-spec{font-size:12px;color:var(--ink2);margin-top:7px;line-height:1.4;font-family:'Fraunces',serif;}
.roaster-styles{display:flex;flex-wrap:wrap;gap:4px;margin-top:8px;}
.roaster-style{padding:3px 9px;border-radius:20px;font-size:10px;background:var(--surface2);border:1px solid var(--border);color:var(--ink3);font-family:'Inter',sans-serif;}
.roaster-match-row{display:flex;align-items:center;gap:6px;margin-top:9px;font-size:11px;color:var(--ink3);font-family:'Inter',sans-serif;}
.match-track{flex:1;height:4px;background:var(--border);border-radius:3px;overflow:hidden;}
.match-fill{height:100%;border-radius:3px;background:var(--navy);opacity:0.7;}

/* SECTION TABS — navy active */
.section-tabs{display:flex;gap:6px;margin-bottom:16px;overflow-x:auto;scrollbar-width:none;}
.section-tabs::-webkit-scrollbar{display:none;}
.stab{padding:7px 15px;border-radius:20px;border:1.5px solid var(--border2);background:var(--surface);font-size:12px;color:var(--ink2);cursor:pointer;white-space:nowrap;transition:all 0.15s;font-family:'Inter',sans-serif;letter-spacing:0.3px;}
.stab.active{background:var(--navy);border-color:var(--navy);color:#fff;}

/* LOGIN */
.login-wrap{background:var(--bg);min-height:100vh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:32px 24px;}
.login-sub{font-size:13px;color:var(--ink3);text-align:center;margin-bottom:28px;line-height:1.6;max-width:260px;font-family:'Fraunces',serif;font-style:italic;}
.login-card{background:none;border-radius:0;padding:0;width:100%;max-width:340px;border:none;box-shadow:none;}
.login-tabs{display:flex;gap:24px;border-bottom:none;margin-bottom:24px;justify-content:center;}
.login-tab{padding:0 0 6px;background:none;border:none;font-family:'Fraunces',serif;font-size:18px;font-weight:300;color:var(--ink3);cursor:pointer;transition:all 0.15s;position:relative;}
.login-tab.active{color:var(--ink);font-style:italic;}
.login-tab.active::after{content:"";position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--accent);}
.login-btn{width:100%;padding:15px;background:var(--ink);color:var(--surface);border:none;border-radius:0;font-family:'Inter',sans-serif;font-size:13px;font-weight:500;cursor:pointer;margin-top:24px;transition:opacity 0.15s;letter-spacing:1.5px;text-transform:uppercase;}
.login-btn:active{opacity:0.85;}
.login-skip{background:none;border:1.5px solid var(--border2);border-radius:20px;padding:7px 18px;color:var(--ink3);font-size:12px;cursor:pointer;margin-top:16px;font-family:'Inter',sans-serif;letter-spacing:0.4px;}
.login-note{font-size:11px;color:var(--ink3);text-align:center;margin-top:12px;line-height:1.5;font-family:'Fraunces',serif;font-style:italic;}

/* PROFILE */
.prof-card{background:var(--surface);border-radius:var(--r);padding:18px;border:1.5px solid var(--border);margin-bottom:14px;display:flex;align-items:center;gap:14px;}
.prof-av{width:50px;height:50px;border-radius:50%;background:var(--surface2);color:var(--ink);font-size:22px;font-family:'Fraunces',serif;display:flex;align-items:center;justify-content:center;flex-shrink:0;font-weight:600;border:2px solid var(--border2);}
.prof-name{font-family:'Fraunces',serif;font-size:20px;color:var(--ink);}
.prof-meta{font-size:12px;color:var(--ink3);margin-top:2px;font-family:'Fraunces',serif;}
.prof-stats{display:flex;gap:16px;margin-top:8px;}
.pstat-n{font-family:'Fraunces',serif;font-size:18px;color:var(--ink);}
.pstat-l{font-size:10px;color:var(--ink3);text-transform:uppercase;letter-spacing:0.5px;font-family:'Inter',sans-serif;}

/* SECTION HEADERS */
.section-hdr{margin-bottom:14px;}
.section-title{font-family:'Fraunces',serif;font-size:20px;color:var(--ink);margin-bottom:3px;}
.section-sub{font-size:11px;color:var(--ink3);font-family:'Fraunces',serif;font-style:italic;}

/* EMPTY */
.empty{text-align:center;padding:52px 20px;}

/* PHOTOS */
.photo-btn{display:flex;align-items:center;justify-content:center;gap:8px;width:100%;padding:14px;background:var(--surface2);border:1.5px dashed var(--border2);border-radius:var(--rsm);cursor:pointer;font-family:'Inter',sans-serif;font-size:13px;color:var(--ink3);transition:all 0.15s;margin-bottom:4px;}
.photo-btn:active{background:var(--surface);border-color:var(--border);}
.photo-preview{width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:var(--rsm);margin-bottom:8px;display:block;}
.photo-thumb{width:56px;height:56px;object-fit:cover;border-radius:8px;flex-shrink:0;border:1.5px solid var(--border);}
.photo-hero{width:100%;aspect-ratio:4/3;object-fit:cover;display:block;}

/* ─── LOG FORM (Sey-inspired: warm, editorial, monochrome + terracotta) ───── */
.lf-sheet{background:var(--bg);}
.lf-hdr{display:flex;align-items:center;justify-content:space-between;padding:26px 26px 0;}
.lf-hdr-eyebrow{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--ink3);font-weight:500;font-family:var(--sans);}
.lf-title{font-family:var(--serif);font-size:38px;font-weight:300;color:var(--ink);line-height:1.05;letter-spacing:-0.5px;padding:22px 26px 0;}
.lf-x{background:none;border:none;cursor:pointer;color:var(--ink);display:flex;padding:0;}
.lf-seg{display:flex;gap:28px;padding:24px 26px 0;}
.lf-seg-btn{background:none;border:none;cursor:pointer;padding:0 0 6px;font-family:var(--serif);font-size:22px;font-weight:300;color:var(--ink3);position:relative;}
.lf-seg-btn.on{color:var(--ink);font-style:italic;}
.lf-seg-btn.on::after{content:"";position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--accent);}
.lf-body{padding:0 26px;}
.lf-input{width:100%;border:none;border-bottom:1px solid var(--border);background:none;padding:12px 0;font-family:var(--serif);font-size:19px;font-weight:300;color:var(--ink);outline:none;transition:border-color 0.15s;}
.lf-input:focus{border-color:var(--accent);}
.lf-input::placeholder{color:var(--ink3);}
.lf-rating-top{display:flex;align-items:flex-end;justify-content:space-between;margin-bottom:4px;}
.lf-rating-lbl{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--ink3);font-weight:500;font-family:var(--sans);padding-bottom:12px;}
.lf-rating-val{font-family:var(--serif);font-size:64px;font-weight:300;color:var(--accent);line-height:0.9;letter-spacing:-1px;}
.lf-rating-val.empty{color:var(--ink3);opacity:0.35;}
.lf-slider{width:100%;-webkit-appearance:none;appearance:none;height:2px;border-radius:0;background:var(--border);outline:none;margin:10px 0;}
.lf-slider::-webkit-slider-thumb{-webkit-appearance:none;appearance:none;width:18px;height:18px;border-radius:50%;background:var(--accent);cursor:pointer;}
.lf-slider::-moz-range-thumb{width:18px;height:18px;border-radius:50%;background:var(--accent);cursor:pointer;border:none;}
.lf-link{background:none;border:none;cursor:pointer;color:var(--ink2);font-family:var(--sans);font-size:13px;display:flex;align-items:center;gap:5px;padding:4px 0;}
.lf-dim-lbl{font-family:var(--serif);font-style:italic;font-size:15px;color:var(--ink);}
.lf-dim-val{font-family:var(--serif);font-size:15px;color:var(--accent);font-weight:500;}
.lf-add-row{display:flex;align-items:center;gap:10px;}
.lf-add-row .lf-pick-search{flex:1;margin-bottom:0;}
.lf-add-btn{flex-shrink:0;background:var(--ink);color:var(--surface);border:none;padding:9px 18px;font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:1px;text-transform:uppercase;cursor:pointer;}
.lf-dim-desc{font-size:12px;color:var(--ink3);font-family:var(--sans);}
.lf-section-lbl{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--ink3);padding:30px 0 6px;font-family:var(--sans);font-weight:500;}
.lf-row{display:flex;align-items:center;justify-content:space-between;padding:17px 0;border-bottom:1px solid var(--border);cursor:pointer;background:none;border-left:none;border-right:none;border-top:none;width:100%;text-align:left;}
.lf-row-lbl{font-family:var(--sans);font-size:15px;color:var(--ink);font-weight:400;}
.lf-row-val{display:flex;align-items:center;gap:10px;font-size:15px;color:var(--ink2);font-family:var(--serif);font-style:italic;}
.lf-row-val.empty{color:var(--ink3);font-style:normal;}
.lf-row-chevron{color:var(--ink3);display:flex;transition:transform 0.25s;}
.lf-row-chevron.open{transform:rotate(90deg);}
.lf-row-content{padding:4px 0 20px;}
.lf-pickgrid{display:flex;flex-wrap:wrap;gap:8px;}
.lf-pick{padding:9px 16px;border:none;border-bottom:1.5px solid var(--border);background:none;font-family:var(--sans);font-size:14px;color:var(--ink2);cursor:pointer;transition:all 0.15s;}
.lf-pick.on{color:var(--accent);border-bottom-color:var(--accent);font-weight:500;}
.lf-pick-search{width:100%;border:none;border-bottom:1.5px solid var(--border);background:none;padding:10px 0;font-family:var(--sans);font-size:15px;color:var(--ink);outline:none;margin-bottom:16px;}
.lf-pick-search:focus{border-bottom-color:var(--accent);}
.lf-save-bar{padding:30px 0 40px;}
.lf-save{width:100%;background:var(--ink);color:var(--surface);border:none;border-radius:0;padding:18px;font-family:var(--sans);font-size:14px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;transition:opacity 0.15s;}
.lf-save:disabled{background:none;color:var(--ink3);border:1px solid var(--border);cursor:not-allowed;}
.lf-photo-row{display:flex;align-items:center;gap:10px;padding:17px 0;border-bottom:1px solid var(--border);cursor:pointer;}
.lf-photo-thumb{width:48px;height:48px;border-radius:6px;object-fit:cover;flex-shrink:0;}

/* ─── FEED & RANKINGS (Sey language) ──────────────────────────────────────── */
.rk-hdr{padding:30px 0 0;}
.rk-eyebrow{font-size:11px;letter-spacing:2.5px;text-transform:uppercase;color:var(--ink3);font-weight:500;font-family:var(--sans);margin-bottom:8px;}
.rk-title{font-family:var(--serif);font-size:36px;font-weight:300;color:var(--ink);letter-spacing:-0.5px;}
.rk-toggle{display:flex;gap:28px;padding:22px 0 0;}
.rk-tg{background:none;border:none;cursor:pointer;padding:0 0 6px;font-family:var(--serif);font-size:22px;font-weight:300;color:var(--ink3);position:relative;}
.rk-tg.on{color:var(--ink);font-style:italic;}
.rk-tg.on::after{content:"";position:absolute;bottom:0;left:0;right:0;height:2px;background:var(--accent);}
.rk-search{display:flex;align-items:center;gap:10px;border-bottom:1.5px solid var(--line);padding:12px 0;margin-top:18px;}
.rk-search-in{flex:1;border:none;background:none;outline:none;font-family:var(--sans);font-size:15px;color:var(--ink);}
.rk-search-in::placeholder{color:var(--ink3);}
.rk-search-x{background:none;border:none;cursor:pointer;color:var(--ink3);font-size:13px;padding:0 2px;}
.rk-cityrow{display:flex;gap:8px;overflow-x:auto;padding:18px 0 4px;scrollbar-width:none;}
.rk-cityrow::-webkit-scrollbar{display:none;}
.rk-citychip{flex-shrink:0;background:none;border:none;border-bottom:1.5px solid var(--line);padding:7px 14px;font-family:var(--sans);font-size:13px;color:var(--ink2);cursor:pointer;white-space:nowrap;}
.rk-citychip.on{color:var(--accent);border-bottom-color:var(--accent);font-weight:500;}
.rk-empty{padding:40px 0;text-align:center;color:var(--ink3);font-family:var(--serif);font-style:italic;}
.rk-empty-block{padding:50px 0;text-align:center;}
.rk-empty-serif{font-family:var(--serif);font-size:20px;font-style:italic;color:var(--ink2);margin-bottom:8px;}
.rk-empty-sub{font-family:var(--sans);font-size:13px;color:var(--ink3);max-width:260px;margin:0 auto;line-height:1.5;}
.rk-foot{padding:24px 0 0;font-family:var(--serif);font-size:12px;font-style:italic;color:var(--ink3);line-height:1.5;text-align:center;}

/* Feed card */
.feed-card{padding:24px 0;border-bottom:1px solid var(--line);}
.feed-author{display:flex;align-items:center;gap:12px;margin-bottom:16px;}
.feed-avatar{width:38px;height:38px;border-radius:50%;border:1px solid var(--line);display:flex;align-items:center;justify-content:center;flex-shrink:0;background:var(--surface);font-family:var(--sans);font-size:13px;font-weight:500;color:var(--ink2);}
.feed-name{font-family:var(--sans);font-size:14px;font-weight:500;color:var(--ink);}
.feed-time{font-family:var(--sans);font-size:12px;color:var(--ink3);}
.feed-score{font-family:var(--serif);font-size:30px;font-weight:300;color:var(--accent);line-height:1;letter-spacing:-0.5px;}
.feed-photo{width:100%;aspect-ratio:16/10;object-fit:cover;border-radius:8px;margin-bottom:16px;display:block;}
.feed-coffee{font-family:var(--serif);font-size:21px;font-weight:400;color:var(--ink);line-height:1.2;margin-bottom:4px;}
.feed-meta{font-family:var(--sans);font-size:13px;color:var(--ink2);margin-bottom:14px;}
.feed-comment{font-family:var(--serif);font-size:15px;font-style:italic;color:var(--ink2);line-height:1.5;margin-bottom:14px;}
.feed-notes{display:flex;flex-wrap:wrap;gap:14px;}
.feed-note{font-family:var(--sans);font-size:13px;color:var(--ink2);border-bottom:1.5px solid var(--accent);padding-bottom:1px;}

/* Ranking row */
.rank-row{display:flex;align-items:center;gap:16px;padding:18px 0;border-bottom:1px solid var(--line);}
.rank-num{font-family:var(--mono);font-size:13px;color:var(--ink3);width:24px;flex-shrink:0;letter-spacing:0.5px;}
.rank-body{flex:1;min-width:0;}
.rank-name{font-family:var(--serif);font-size:18px;font-weight:400;color:var(--ink);line-height:1.2;margin-bottom:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.rank-sub{font-family:var(--sans);font-size:12px;color:var(--ink3);}
.rank-score{font-family:var(--serif);font-size:26px;font-weight:300;color:var(--accent);line-height:1;letter-spacing:-0.5px;flex-shrink:0;}

/* People & profile */
.person-row{display:flex;align-items:center;gap:12px;padding:14px 0;border-bottom:1px solid var(--line);}
.person-main{flex:1;display:flex;align-items:center;gap:12px;background:none;border:none;cursor:pointer;text-align:left;min-width:0;padding:0;}
.person-name{font-family:var(--sans);font-size:15px;font-weight:500;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.person-sub{font-family:var(--sans);font-size:12px;color:var(--ink3);margin-top:1px;}
.follow-btn{flex-shrink:0;background:var(--ink);color:var(--surface);border:none;padding:8px 18px;font-family:var(--sans);font-size:12px;font-weight:500;letter-spacing:0.5px;text-transform:uppercase;cursor:pointer;}
.follow-btn.following{background:none;color:var(--ink3);border:1px solid var(--line);}
.follow-btn-lg{width:100%;background:var(--ink);color:var(--surface);border:none;padding:14px;font-family:var(--sans);font-size:13px;font-weight:500;letter-spacing:1.5px;text-transform:uppercase;cursor:pointer;}
.follow-btn-lg.following{background:none;color:var(--ink2);border:1px solid var(--line);}
.prof-num{font-family:var(--serif);font-size:20px;color:var(--ink);font-weight:400;}
.prof-lbl{font-family:var(--sans);font-size:12px;color:var(--ink3);}

/* RANKINGS */
.rank-card{background:var(--surface);border-radius:var(--r);border:1.5px solid var(--border);padding:14px 16px;margin-bottom:10px;display:flex;gap:14px;align-items:flex-start;}
.rank-medal{font-size:28px;flex-shrink:0;width:36px;text-align:center;line-height:1.2;}
.rank-info{flex:1;min-width:0;}
.rank-name{font-family:'Fraunces',serif;font-size:16px;color:var(--ink);margin-bottom:2px;}
.rank-sub{font-size:11px;color:var(--ink3);font-family:'Fraunces',serif;margin-bottom:6px;}
.rank-score{font-family:'Fraunces',serif;font-size:26px;color:var(--ink);line-height:1;}
.rank-count{font-family:'DM Mono',monospace;font-size:9px;color:var(--ink3);margin-top:2px;}
.empty-icon{font-size:40px;margin-bottom:12px;display:block;opacity:0.4;}
.empty-t{font-family:'Fraunces',serif;font-size:20px;color:var(--ink);margin-bottom:5px;}
.empty-s{font-size:13px;color:var(--ink3);line-height:1.5;font-family:'Fraunces',serif;font-style:italic;}
`;

// ─── MICRO COMPONENTS ─────────────────────────────────────────────────────────
function Chips({ options, value, onChange, multi=false }) {
  const isSel=o=>multi?(value||[]).includes(typeof o==="string"?o:o.id):value===(typeof o==="string"?o:o.id);
  const click=o=>{ const id=typeof o==="string"?o:o.id; if(multi){const c=value||[];onChange(c.includes(id)?c.filter(x=>x!==id):[...c,id]);}else onChange(value===id?null:id); };
  return <div className="chip-grid">{options.map((o,i)=><button key={i} className={`chip ${isSel(o)?"sel":""}`} onClick={()=>click(o)}>{typeof o==="string"?o:(o.icon?`${o.icon} ${o.label}`:o.label)}{o.desc&&<span style={{fontSize:10,display:"block",opacity:0.65,marginTop:2}}>{o.desc}</span>}</button>)}</div>;
}
function SliderF({ label, min, max, value, onChange, unit="" }) {
  const p=((value-min)/(max-min)*100).toFixed(0);
  return <div className="fgrp"><label className="flabel">{label}</label><div className="slider-row"><input type="range" min={min} max={max} value={value} onChange={e=>onChange(Number(e.target.value))} style={{"--v":`${p}%`}}/><span className="slider-val">{value}{unit}</span></div></div>;
}
function Tgl({ on, onToggle, label, sub }) {
  return <div className="tgl-row"><div><div className="tgl-label">{label}</div>{sub&&<div className="tgl-sub">{sub}</div>}</div><button className={`tgl ${on?"on":""}`} onClick={onToggle}/></div>;
}
function NotePicker({ value=[], onChange }) {
  return <div>{Object.entries(NOTE_FAMILIES).map(([fam,data])=><div key={fam} style={{marginBottom:14}}><div style={{fontSize:10,fontWeight:600,letterSpacing:"0.8px",textTransform:"uppercase",color:data.color,marginBottom:6,fontFamily:"'Inter',sans-serif"}}>{fam}</div><div className="chip-grid">{data.notes.map(n=>{const sel=(value||[]).includes(n);return <button key={n} className="chip" onClick={()=>onChange(sel?value.filter(x=>x!==n):[...value,n])} style={sel?{background:data.bg,borderColor:data.border,color:data.color}:{}}>{n}</button>;})}</div></div>)}</div>;
}

// ─── GOOGLE PLACES AUTOCOMPLETE ───────────────────────────────────────────────
// Loads the Google Maps JS SDK once and provides a café/place search box.
// Requires VITE_GOOGLE_MAPS_KEY in your .env file.
const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_KEY || 'AIzaSyDsGpeS5hx_cEXTTDAiSKGOWQvAdF6BSa4';
let googleMapsPromise = null;
function loadGoogleMaps() {
  if(googleMapsPromise) return googleMapsPromise;
  if(!GOOGLE_MAPS_KEY) return Promise.reject(new Error("No Google Maps key"));
  googleMapsPromise = new Promise((resolve,reject)=>{
    if(window.google?.maps?.places){ resolve(window.google.maps); return; }
    const script=document.createElement("script");
    // loading=async is required by the new Places API
    script.src=`https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places&loading=async&v=weekly`;
    script.async=true; script.defer=true;
    script.onload=()=>resolve(window.google.maps);
    script.onerror=()=>reject(new Error("Failed to load Google Maps"));
    document.head.appendChild(script);
  });
  return googleMapsPromise;
}

// Uses the NEW Places API (AutocompleteSuggestion + Place), since the legacy
// AutocompleteService/PlacesService classes are blocked for new Google projects.
function PlacesAutocomplete({ value, onSelect, placeholder }) {
  const [query,setQuery]=useState(value||"");
  const [predictions,setPredictions]=useState([]);
  const [open,setOpen]=useState(false);
  const mapsRef=useRef(null);
  const tokenRef=useRef(null);
  const debounceRef=useRef(null);

  useEffect(()=>{
    if(!GOOGLE_MAPS_KEY) return;
    loadGoogleMaps().then(async maps=>{
      // Import the Places library (new API uses importLibrary)
      await maps.importLibrary("places");
      mapsRef.current=maps;
    }).catch(()=>{ mapsRef.current=null; });
  },[]);

  const search=(text)=>{
    setQuery(text); onSelect({ name:text }); setOpen(true);
    if(debounceRef.current) clearTimeout(debounceRef.current);
    if(!mapsRef.current||!text||text.length<2){ setPredictions([]); return; }
    debounceRef.current=setTimeout(async()=>{
      try {
        const { AutocompleteSuggestion, AutocompleteSessionToken } = mapsRef.current.places;
        if(!tokenRef.current) tokenRef.current=new AutocompleteSessionToken();
        const { suggestions } = await AutocompleteSuggestion.fetchAutocompleteSuggestions({
          input: text,
          sessionToken: tokenRef.current,
          includedPrimaryTypes: ["establishment"],
        });
        setPredictions(suggestions||[]);
      } catch(err){ console.warn("Places autocomplete error:",err); setPredictions([]); }
    },250);
  };

  const pick=async(suggestion)=>{
    const pred=suggestion.placePrediction;
    setOpen(false); setPredictions([]);
    const mainText=pred.mainText?.text||pred.text?.text||"";
    setQuery(mainText);
    try {
      const place=pred.toPlace();
      await place.fetchFields({ fields:["displayName","formattedAddress","location","id","addressComponents"] });
      onSelect({
        name: place.displayName||mainText,
        address: place.formattedAddress,
        placeId: place.id,
        lat: place.location?.lat(),
        lng: place.location?.lng(),
      });
      tokenRef.current=null; // session ends after a pick
    } catch(err){
      console.warn("Place details error:",err);
      onSelect({ name:mainText });
    }
  };

  // Fallback when no API key — plain text input
  if(!GOOGLE_MAPS_KEY){
    return (
      <input className="finput" placeholder="e.g. Radio Roasters" value={value!==undefined?value:query}
        onChange={ev=>{ setQuery(ev.target.value); onSelect({ name:ev.target.value }); }}/>
    );
  }

  return (
    <div style={{position:"relative"}}>
      <input className="finput" placeholder={placeholder||"Search for a café…"} value={query}
        onChange={ev=>search(ev.target.value)} onFocus={()=>setOpen(true)}
        onBlur={()=>setTimeout(()=>setOpen(false),200)}/>
      {open&&predictions.length>0&&(
        <div style={{position:"absolute",top:"100%",left:0,right:0,background:"var(--surface)",border:"1.5px solid var(--border)",borderRadius:"var(--rsm)",marginTop:4,zIndex:50,boxShadow:"0 8px 24px rgba(26,18,8,0.15)",overflow:"hidden"}}>
          {predictions.slice(0,5).map((sugg,i)=>{
            const pred=sugg.placePrediction;
            const main=pred.mainText?.text||pred.text?.text||"";
            const secondary=pred.secondaryText?.text||"";
            return (
              <button key={pred.placeId||i} onMouseDown={()=>pick(sugg)}
                style={{display:"block",width:"100%",textAlign:"left",padding:"10px 12px",background:"none",border:"none",borderBottom:"1px solid var(--border)",cursor:"pointer"}}>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,color:"var(--ink)",fontWeight:500}}>{main}</div>
                {secondary&&<div style={{fontFamily:"'Fraunces',serif",fontSize:11,color:"var(--ink3)",marginTop:1}}>{secondary}</div>}
              </button>
            );
          })}
          <div style={{padding:"5px 12px",fontSize:9,color:"var(--ink3)",fontFamily:"'Inter',sans-serif",textAlign:"right",letterSpacing:"0.5px"}}>Powered by Google</div>
        </div>
      )}
    </div>
  );
}

function LogForm({ onSave, onClose, currentUser, editEntry }) {
  const [e,setE]=useState(editEntry?{...editEntry,scores:editEntry.scores||{},tastingNotes:editEntry.tastingNotes||[],cafeTags:editEntry.cafeTags||[],customNote:""}:{type:"home",drinkType:null,customDrinkType:"",name:"",roaster:"",origin:null,customOrigin:"",process:null,roastLevel:null,method:null,grinder:null,machine:null,water:null,waterTemp:null,coffeeGrams:null,yieldGrams:null,extractionTime:null,grindSetting:"",scores:{},notes:"",tastingNotes:[],customNote:"",cafeName:"",cafeLocation:"",cafeCity:"",cafePlaceId:null,cafeAddress:"",cafeLat:null,cafeLng:null,cafeRating:null,cafeTags:[],date:new Date().toISOString().split("T")[0],beanFreshness:null,isDecaf:false,hasMilk:false,isPublic:false,shareAs:"name"});
  const [showFull,setShowFull]=useState(false);
  const [photo,setPhoto]=useState(null);
  const [customMachineInput,setCustomMachineInput]=useState("");
  const [customGrinderInput,setCustomGrinderInput]=useState("");
  const [customWaterInput,setCustomWaterInput]=useState("");
  const [savedMachines,setSavedMachines]=useState(()=>{ try{return JSON.parse(localStorage.getItem("mc_machines")||"[]");}catch{return[];} });
  const [savedGrinders,setSavedGrinders]=useState(()=>{ try{return JSON.parse(localStorage.getItem("mc_grinders")||"[]");}catch{return[];} });
  const [savedRoasters,setSavedRoasters]=useState(()=>{ try{return JSON.parse(localStorage.getItem("mc_roasters")||"[]");}catch{return[];} });
  const [savedWaters,setSavedWaters]=useState(()=>{ try{return JSON.parse(localStorage.getItem("mc_waters")||"[]");}catch{return[];} });
  const [savedNotes,setSavedNotes]=useState(()=>{ try{return JSON.parse(localStorage.getItem("mc_notes")||"[]");}catch{return[];} });
  const [savedOrigins,setSavedOrigins]=useState(()=>{ try{return JSON.parse(localStorage.getItem("mc_origins")||"[]");}catch{return[];} });
  const [placeBeans,setPlaceBeans]=useState([]);   // coffees others have logged at this place
  const [loadingBeans,setLoadingBeans]=useState(false);
  const s=(k,v)=>setE(p=>({...p,[k]:v}));
  const isHome=e.type==="home", isEsp=["espresso","latte","cappuccino","cortado","flat_white"].includes(e.drinkType);
  const isPod=["keurig","nespresso"].includes(e.drinkType)||["Keurig","Nespresso"].includes(e.method);
  const isB2C=["bean_to_cup"].includes(e.drinkType)||["Bean-to-Cup"].includes(e.method);
  const allMachines=[...savedMachines,...MACHINES.filter(m=>!savedMachines.includes(m))];
  const allGrinders=[...savedGrinders,...GRINDERS.filter(g=>!savedGrinders.includes(g))];
  const addMachine=(val)=>{ if(!val||!val.trim()) return; const t=val.trim(); const upd=[t,...savedMachines.filter(x=>x!==t)].slice(0,10); localStorage.setItem("mc_machines",JSON.stringify(upd)); setSavedMachines(upd); s("machine",t); setCustomMachineInput(""); };
  const addGrinder=(val)=>{ if(!val||!val.trim()) return; const t=val.trim(); const upd=[t,...savedGrinders.filter(x=>x!==t)].slice(0,10); localStorage.setItem("mc_grinders",JSON.stringify(upd)); setSavedGrinders(upd); s("grinder",t); setCustomGrinderInput(""); };
  const allWaters=[...savedWaters,...WATER_TYPES.filter(w=>!savedWaters.includes(w))];
  const addWater=(val)=>{ if(!val||!val.trim()) return; const t=val.trim(); const upd=[t,...savedWaters.filter(x=>x!==t)].slice(0,10); localStorage.setItem("mc_waters",JSON.stringify(upd)); setSavedWaters(upd); s("water",t); setCustomWaterInput(""); };
  // Persist any custom value the user adds so it's reusable next time
  const persistCustom=(key,setter,list,val)=>{ if(!val||!val.trim())return; const t=val.trim(); if(list.includes(t))return; const upd=[t,...list].slice(0,40); localStorage.setItem(key,JSON.stringify(upd)); setter(upd); };
  const addCustomNote=(val)=>{ if(!val||!val.trim())return; const t=val.trim(); s("tastingNotes",[...e.tastingNotes,t]); persistCustom("mc_notes",setSavedNotes,savedNotes,t); s("customNote",""); };

  // Look up coffees others (and you) have logged at a given place or roaster.
  // This is what makes the "menu" build itself — every logged bean becomes a
  // suggestion for the next person who visits the same place.
  const lookupPlaceBeans=useCallback(async(placeName,placeId,roasterName)=>{
    if((!placeName||placeName.length<2)&&(!roasterName||roasterName.length<2)){ setPlaceBeans([]); return; }
    setLoadingBeans(true);
    try {
      // Match by place_id, then café name, then roaster name — whichever we have.
      // Matching by roaster is what builds the shared catalogue of each roaster's coffees.
      let q=supabase.from("entries")
        .select("coffee_name, roaster, origin, roast_level, process, score_aroma, score_flavour, score_mouthfeel, score_finish")
        .not("coffee_name","is",null)
        .limit(60);
      if(placeId) q=q.eq("cafe_place_id",placeId);
      else if(placeName&&placeName.length>=2) q=q.ilike("cafe_name",placeName.trim());
      else if(roasterName&&roasterName.length>=2) q=q.ilike("roaster",roasterName.trim());
      const { data, error } = await q;
      if(error){ console.warn("Bean lookup failed:",error.message); setPlaceBeans([]); setLoadingBeans(false); return; }
      // Dedupe by coffee name, keep the most-logged ones with avg score
      const map={};
      (data||[]).forEach(e=>{
        const key=(e.coffee_name||"").trim().toLowerCase();
        if(!key) return;
        if(!map[key]) map[key]={ name:e.coffee_name.trim(), roaster:e.roaster, origin:e.origin, roast:e.roast_level, process:e.process, count:0, scores:[] };
        map[key].count++;
        const comp=computeOverall({aroma:e.score_aroma,flavour:e.score_flavour,mouthfeel:e.score_mouthfeel,finish:e.score_finish});
        if(comp>0) map[key].scores.push(comp);
      });
      const beans=Object.values(map)
        .map(b=>({ ...b, avg: b.scores.length? (b.scores.reduce((a,c)=>a+c,0)/b.scores.length).toFixed(1):null }))
        .sort((a,b)=>b.count-a.count)
        .slice(0,8);
      setPlaceBeans(beans);
    } catch(err){ console.warn("Bean lookup error:",err); setPlaceBeans([]); }
    finally { setLoadingBeans(false); }
  },[]);
  const [openRow,setOpenRow]=useState(null);  // which detail row is expanded
  const [showDims,setShowDims]=useState(false);
  const [originSearch,setOriginSearch]=useState("");
  const toggle=(row)=>setOpenRow(openRow===row?null:row);

  const overall=computeOverall(e.scores);
  const hasScore=Object.keys(e.scores).length>0;
  const drinkLabel=DRINK_TYPES.find(d=>d.id===e.drinkType)?.label;
  const roastLabel=ROAST_LEVELS.find(r=>r.id===e.roastLevel)?.label;
  const freshLabels={fresh:"Fresh",peak:"Peak",past_peak:"Past Peak",stale:"Stale",unknown:"Unknown"};

  // Set overall score directly from the single slider (maps to flavour-weighted distribution)
  const setOverall=(val)=>{
    const v=Number(val);
    // Distribute a single overall score across dims as a starting point
    s("scores",{aroma:v,flavour:v,mouthfeel:v,finish:v});
  };

  const Chev=({open})=><svg className={`lf-row-chevron ${open?"open":""}`} width="16" height="16" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>;

  return (
    <div className="overlay" onClick={ev=>ev.target===ev.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"94vh",padding:0,overflow:"hidden",display:"flex",flexDirection:"column",background:"var(--bg)"}}>
        <div className="lf-sheet" style={{overflowY:"auto",flex:1}}>

          {/* Header */}
          <div className="lf-hdr">
            <button className="lf-x" onClick={onClose}><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M18 6L6 18M6 6l12 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg></button>
            <span className="lf-hdr-eyebrow">{editEntry?"Edit Entry":"New Entry"}</span>
            <div style={{width:22}}/>
          </div>

          <div className="lf-title">{editEntry?"Edit coffee":"Log a coffee"}</div>

          {/* Home / Café */}
          <div className="lf-seg">
            <button className={`lf-seg-btn ${isHome?"on":""}`} onClick={()=>s("type","home")}>Home</button>
            <button className={`lf-seg-btn ${!isHome?"on":""}`} onClick={()=>s("type","cafe")}>Café</button>
          </div>

          <div className="lf-body">

          {/* Coffee name — the roaster's name for the coffee */}
          <div style={{paddingTop:22}}>
            <input className="lf-input" placeholder="Name of the coffee" value={e.name} onChange={ev=>{s("name",ev.target.value);}}/>
            <div style={{fontSize:12,color:"var(--ink3)",fontFamily:"var(--sans)",marginTop:6,lineHeight:1.4}}>As the roaster names it, e.g. "Ethiopia Guji Natural" — so others can find it too.</div>
            {placeBeans.length>0&&!e.name&&<div style={{marginTop:12}}>
              <div style={{fontSize:11,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--accent)",marginBottom:8,fontFamily:"var(--sans)",fontWeight:500}}>{e.cafeName?"Logged here before":"Coffees from this roaster"}</div>
              <div className="lf-pickgrid">
                {placeBeans.map(b=><button key={b.name} className="lf-pick" onClick={()=>{s("name",b.name);if(b.roaster&&!e.roaster)s("roaster",b.roaster);if(b.origin&&!e.origin)s("origin",b.origin);if(b.roast&&!e.roastLevel)s("roastLevel",b.roast);if(b.process&&!e.process)s("process",b.process);}}>{b.name}</button>)}
              </div>
            </div>}
          </div>

          {/* Rating — hero moment */}
          <div style={{paddingTop:30}}>
            <div className="lf-rating-top">
              <span className="lf-rating-lbl">Rating</span>
              <span className={`lf-rating-val ${!hasScore?"empty":""}`}>{hasScore?overall.toFixed(1):"—"}</span>
            </div>
            <input className="lf-slider" type="range" min="0" max="10" step="0.1" value={hasScore?overall:5} onChange={ev=>setOverall(ev.target.value)}/>
            <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
              {hasScore?<button className="lf-link" onClick={()=>{s("scores",{});setShowDims(false);}}>Clear</button>:<span/>}
              <button className="lf-link" onClick={()=>setShowDims(!showDims)}>
                {showDims?"Hide detail":"Rate in detail"}
                <svg className={`lf-row-chevron ${showDims?"open":""}`} width="14" height="14" viewBox="0 0 24 24" fill="none"><path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
              </button>
            </div>
            {showDims&&<div style={{marginTop:18,display:"flex",flexDirection:"column",gap:20,paddingTop:20,borderTop:"1px solid var(--border)"}}>
              {RATING_DIMS.map(d=>(
                <div key={d.id}>
                  <div style={{display:"flex",alignItems:"baseline",justifyContent:"space-between",marginBottom:2}}>
                    <span className="lf-dim-lbl">{d.label}</span>
                    <span className="lf-dim-val">{e.scores[d.id]!=null?Number(e.scores[d.id]).toFixed(1):"—"}</span>
                  </div>
                  <div className="lf-dim-desc" style={{marginBottom:2}}>{d.desc}</div>
                  <input className="lf-slider" type="range" min="1" max="10" step="0.1" value={e.scores[d.id]||5} onChange={ev=>s("scores",{...e.scores,[d.id]:Number(ev.target.value)})}/>
                </div>
              ))}
            </div>}
          </div>

          {/* ── CAFÉ (only for café visits) ── */}
          {!isHome&&<>
            <div className="lf-section-lbl">Where you had it</div>
            <div className="lf-field">
              <PlacesAutocomplete value={e.cafeName} placeholder="Search for Radio Roasters…"
                onSelect={place=>{
                  s("cafeName",place.name||"");
                  if(place.address){ s("cafeAddress",place.address); s("cafeLocation",place.address); }
                  if(place.city) s("cafeCity",place.city);
                  if(place.placeId) s("cafePlaceId",place.placeId);
                  if(place.lat) s("cafeLat",place.lat);
                  if(place.lng) s("cafeLng",place.lng);
                  if(place.name) lookupPlaceBeans(place.name, place.placeId);
                }}/>
              {e.cafeAddress&&<div style={{marginTop:8,fontSize:12,color:"var(--ink3)",fontFamily:"'Fraunces',serif",fontStyle:"italic",display:"flex",alignItems:"center",gap:5}}>📍 {e.cafeAddress}</div>}
            </div>
            {placeBeans.length>0&&<div className="lf-row-content" style={{background:"none",borderBottom:"1px solid var(--border)"}}>
              <div style={{fontSize:10,fontFamily:"'Inter',sans-serif",letterSpacing:"1px",textTransform:"uppercase",color:"var(--ink3)",marginBottom:8}}>☕ Logged here by the community</div>
              {placeBeans.map(b=>(
                <button key={b.name} onClick={()=>{s("name",b.name);if(b.roaster)s("roaster",b.roaster);if(b.origin)s("origin",b.origin);if(b.roast)s("roastLevel",b.roast);if(b.process)s("process",b.process);}} style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:10,width:"100%",padding:"9px 11px",marginBottom:6,background:e.name===b.name?"var(--sage)":"var(--surface)",border:`1.5px solid ${e.name===b.name?"var(--sage)":"var(--border)"}`,borderRadius:9,cursor:"pointer",textAlign:"left"}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:500,color:e.name===b.name?"#fff":"var(--ink)"}}>{b.name}</div>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:11,color:e.name===b.name?"rgba(255,255,255,0.7)":"var(--ink3)"}}>{[b.origin,b.process].filter(Boolean).join(" · ")||"Tap to use"}</div>
                  </div>
                  {b.avg&&<div style={{fontFamily:"'Fraunces',serif",fontSize:14,color:e.name===b.name?"#fff":"var(--ink2)"}}>{b.avg}</div>}
                </button>
              ))}
            </div>}

            {/* Rate the café itself */}
            <div className="lf-section-lbl">Rate the café</div>
            <div style={{display:"flex",alignItems:"flex-end",justifyContent:"space-between",marginBottom:4}}>
              <span style={{fontFamily:"var(--sans)",fontSize:13,color:"var(--ink3)"}}>The space, service, vibe</span>
              <span style={{fontFamily:"var(--serif)",fontSize:40,fontWeight:300,color:e.cafeRating!=null?"var(--accent)":"var(--ink3)",opacity:e.cafeRating!=null?1:0.35,lineHeight:0.9,letterSpacing:"-1px"}}>{e.cafeRating!=null?Number(e.cafeRating).toFixed(1):"—"}</span>
            </div>
            <input className="lf-slider" type="range" min="0" max="10" step="0.1" value={e.cafeRating!=null?e.cafeRating:5} onChange={ev=>s("cafeRating",Number(ev.target.value))}/>

            {/* Café tags */}
            <div className="lf-section-lbl">Tags</div>
            <div style={{fontSize:12,color:"var(--ink3)",fontFamily:"var(--sans)",marginBottom:12,marginTop:-2}}>What's this place good for?</div>
            <div className="lf-pickgrid">
              {CAFE_TAGS.map(t=>{const on=e.cafeTags.includes(t);return <button key={t} className={`lf-pick ${on?"on":""}`} onClick={()=>s("cafeTags",on?e.cafeTags.filter(x=>x!==t):[...e.cafeTags,t])}>{t}</button>;})}
            </div>
          </>}

          {/* ── DETAILS (rows) ── */}
          <div className="lf-section-lbl">Details</div>
          <div className="lf-rows">

            {/* Drink type */}
            <button className="lf-row" onClick={()=>toggle("drink")}>
              <span className="lf-row-lbl">Drink type</span>
              <span className={`lf-row-val ${!e.drinkType?"empty":""}`}>{e.drinkType==="other"?(e.customDrinkType||"Other"):(drinkLabel||"Choose")}<Chev open={openRow==="drink"}/></span>
            </button>
            {openRow==="drink"&&<div className="lf-row-content">
              <div className="lf-pickgrid">
                {DRINK_TYPES.map(d=><button key={d.id} className={`lf-pick ${e.drinkType===d.id?"on":""}`} onClick={()=>{s("drinkType",d.id);if(d.id!=="other")setOpenRow(null);}}>{d.label}</button>)}
              </div>
              {e.drinkType==="other"&&<input className="lf-pick-search" style={{marginTop:16,marginBottom:0}} placeholder="Describe your drink…" value={e.customDrinkType} onChange={ev=>s("customDrinkType",ev.target.value)}/>}
            </div>}

            {/* Roaster */}
            <button className="lf-row" onClick={()=>toggle("roaster")}>
              <span className="lf-row-lbl">Roaster</span>
              <span className={`lf-row-val ${!e.roaster?"empty":""}`}>{e.roaster||"Add"}<Chev open={openRow==="roaster"}/></span>
            </button>
            {openRow==="roaster"&&<div className="lf-row-content">
              <input className="lf-pick-search" placeholder="e.g. Radio Roasters, Square Mile…" value={e.roaster} onChange={ev=>{s("roaster",ev.target.value);}} onBlur={ev=>{if(ev.target.value&&!e.cafeName)lookupPlaceBeans(null,null,ev.target.value);}}/>
              {savedRoasters.length>0&&<div className="lf-pickgrid">{savedRoasters.map(r=><button key={r} className={`lf-pick ${e.roaster===r?"on":""}`} onClick={()=>{s("roaster",r);lookupPlaceBeans(null,null,r);}}>{r}</button>)}</div>}
            </div>}

            {/* Origin */}
            <button className="lf-row" onClick={()=>toggle("origin")}>
              <span className="lf-row-lbl">Origin</span>
              <span className={`lf-row-val ${!e.origin&&!e.customOrigin?"empty":""}`}>{e.origin||e.customOrigin||"Add"}<Chev open={openRow==="origin"}/></span>
            </button>
            {openRow==="origin"&&<div className="lf-row-content">
              <input className="lf-pick-search" placeholder="Search origins…" value={originSearch} onChange={ev=>setOriginSearch(ev.target.value)}/>
              <div className="lf-pickgrid">
                {[...savedOrigins.filter(o=>!ORIGINS.includes(o)),...ORIGINS].filter(o=>!originSearch||o.toLowerCase().includes(originSearch.toLowerCase())).map(o=><button key={o} className={`lf-pick ${e.origin===o||e.customOrigin===o?"on":""}`} onClick={()=>{if(ORIGINS.includes(o)){s("origin",o);s("customOrigin","");}else{s("customOrigin",o);s("origin",null);}setOpenRow(null);}}>{o}</button>)}
                {originSearch&&!ORIGINS.some(o=>o.toLowerCase()===originSearch.toLowerCase())&&!savedOrigins.some(o=>o.toLowerCase()===originSearch.toLowerCase())&&<button className="lf-pick" onClick={()=>{s("customOrigin",originSearch);s("origin",null);persistCustom("mc_origins",setSavedOrigins,savedOrigins,originSearch);setOpenRow(null);}}>Use "{originSearch}"</button>}
              </div>
            </div>}

            {/* Roast level */}
            <button className="lf-row" onClick={()=>toggle("roast")}>
              <span className="lf-row-lbl">Roast level</span>
              <span className={`lf-row-val ${!e.roastLevel?"empty":""}`}>{roastLabel||"Add"}<Chev open={openRow==="roast"}/></span>
            </button>
            {openRow==="roast"&&<div className="lf-row-content">
              <div className="lf-pickgrid">{ROAST_LEVELS.map(r=><button key={r.id} className={`lf-pick ${e.roastLevel===r.id?"on":""}`} onClick={()=>{s("roastLevel",r.id);setOpenRow(null);}}>{r.label}</button>)}</div>
            </div>}

            {/* Process */}
            <button className="lf-row" onClick={()=>toggle("process")}>
              <span className="lf-row-lbl">Process</span>
              <span className={`lf-row-val ${!e.process?"empty":""}`}>{e.process||"Add"}<Chev open={openRow==="process"}/></span>
            </button>
            {openRow==="process"&&<div className="lf-row-content">
              <div className="lf-pickgrid">{PROCESS_METHODS.map(p=><button key={p} className={`lf-pick ${e.process===p?"on":""}`} onClick={()=>{s("process",p);setOpenRow(null);}}>{p}</button>)}</div>
            </div>}

            {/* Freshness */}
            <button className="lf-row" onClick={()=>toggle("fresh")}>
              <span className="lf-row-lbl">Bean freshness</span>
              <span className={`lf-row-val ${!e.beanFreshness?"empty":""}`}>{freshLabels[e.beanFreshness]||"Add"}<Chev open={openRow==="fresh"}/></span>
            </button>
            {openRow==="fresh"&&<div className="lf-row-content">
              <div className="lf-pickgrid">{Object.entries(freshLabels).map(([id,label])=><button key={id} className={`lf-pick ${e.beanFreshness===id?"on":""}`} onClick={()=>{s("beanFreshness",id);setOpenRow(null);}}>{label}</button>)}</div>
            </div>}
          </div>

          {/* ── BREW (home only) ── */}
          {isHome&&<>
            <div className="lf-section-lbl">Brew</div>
            <div className="lf-rows">
              <button className="lf-row" onClick={()=>toggle("method")}>
                <span className="lf-row-lbl">Method</span>
                <span className={`lf-row-val ${!e.method?"empty":""}`}>{e.method||"Add"}<Chev open={openRow==="method"}/></span>
              </button>
              {openRow==="method"&&<div className="lf-row-content">
                <div className="lf-pickgrid">{BREW_METHODS.map(m=><button key={m} className={`lf-pick ${e.method===m?"on":""}`} onClick={()=>{s("method",m);setOpenRow(null);}}>{m}</button>)}</div>
              </div>}

              <button className="lf-row" onClick={()=>toggle("machine")}>
                <span className="lf-row-lbl">Machine</span>
                <span className={`lf-row-val ${!e.machine?"empty":""}`}>{e.machine||"Add"}<Chev open={openRow==="machine"}/></span>
              </button>
              {openRow==="machine"&&<div className="lf-row-content">
                <div className="lf-add-row"><input className="lf-pick-search" placeholder="Add a machine…" value={customMachineInput} onChange={ev=>setCustomMachineInput(ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter")addMachine(customMachineInput);}}/>{customMachineInput.trim()&&<button className="lf-add-btn" onClick={()=>addMachine(customMachineInput)}>Add</button>}</div>
                <div className="lf-pickgrid">{allMachines.map(m=><button key={m} className={`lf-pick ${e.machine===m?"on":""}`} onClick={()=>{s("machine",m);setOpenRow(null);}}>{m}</button>)}</div>
              </div>}

              {!isPod&&!isB2C&&<>
                <button className="lf-row" onClick={()=>toggle("grinder")}>
                  <span className="lf-row-lbl">Grinder</span>
                  <span className={`lf-row-val ${!e.grinder?"empty":""}`}>{e.grinder||"Add"}<Chev open={openRow==="grinder"}/></span>
                </button>
                {openRow==="grinder"&&<div className="lf-row-content">
                  <div className="lf-add-row"><input className="lf-pick-search" placeholder="Add a grinder…" value={customGrinderInput} onChange={ev=>setCustomGrinderInput(ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter")addGrinder(customGrinderInput);}}/>{customGrinderInput.trim()&&<button className="lf-add-btn" onClick={()=>addGrinder(customGrinderInput)}>Add</button>}</div>
                  <div className="lf-pickgrid">{allGrinders.map(g=><button key={g} className={`lf-pick ${e.grinder===g?"on":""}`} onClick={()=>{s("grinder",g);setOpenRow(null);}}>{g}</button>)}</div>
                </div>}
              </>}

              {!isPod&&<button className="lf-row" onClick={()=>toggle("grind")}>
                <span className="lf-row-lbl">Grind setting</span>
                <span className={`lf-row-val ${!e.grindSetting?"empty":""}`}>{e.grindSetting||"Add"}<Chev open={openRow==="grind"}/></span>
              </button>}
              {openRow==="grind"&&<div className="lf-row-content">
                <input className="lf-pick-search" style={{marginBottom:0}} placeholder="e.g. 3.1 · fine · 8 clicks" value={e.grindSetting} onChange={ev=>s("grindSetting",ev.target.value)}/>
              </div>}

              {!isPod&&<button className="lf-row" onClick={()=>toggle("water")}>
                <span className="lf-row-lbl">Water</span>
                <span className={`lf-row-val ${!e.water?"empty":""}`}>{e.water||"Add"}<Chev open={openRow==="water"}/></span>
              </button>}
              {openRow==="water"&&<div className="lf-row-content">
                <div className="lf-add-row"><input className="lf-pick-search" placeholder="Add your own water…" value={customWaterInput} onChange={ev=>setCustomWaterInput(ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter")addWater(customWaterInput);}}/>{customWaterInput.trim()&&<button className="lf-add-btn" onClick={()=>addWater(customWaterInput)}>Add</button>}</div>
                <div className="lf-pickgrid">{allWaters.map(w=><button key={w} className={`lf-pick ${e.water===w?"on":""}`} onClick={()=>{s("water",w);setOpenRow(null);}}>{w}</button>)}</div>
              </div>}

              {/* Precision brew variables — the numbers serious brewers dial in */}
              <button className="lf-row" onClick={()=>toggle("dose")}>
                <span className="lf-row-lbl">Dose (beans)</span>
                <span className={`lf-row-val ${!e.coffeeGrams?"empty":""}`}>{e.coffeeGrams?`${e.coffeeGrams} g`:"Add"}<Chev open={openRow==="dose"}/></span>
              </button>
              {openRow==="dose"&&<div className="lf-row-content">
                <input className="lf-pick-search" style={{marginBottom:0}} type="number" inputMode="decimal" step="0.1" placeholder="e.g. 18" value={e.coffeeGrams||""} onChange={ev=>s("coffeeGrams",ev.target.value)}/>
              </div>}

              <button className="lf-row" onClick={()=>toggle("yield")}>
                <span className="lf-row-lbl">Yield</span>
                <span className={`lf-row-val ${!e.yieldGrams?"empty":""}`}>{e.yieldGrams?`${e.yieldGrams} g`:"Add"}<Chev open={openRow==="yield"}/></span>
              </button>
              {openRow==="yield"&&<div className="lf-row-content">
                <input className="lf-pick-search" style={{marginBottom:0}} type="number" inputMode="decimal" step="0.1" placeholder="e.g. 36 (espresso) or 300 (filter)" value={e.yieldGrams||""} onChange={ev=>s("yieldGrams",ev.target.value)}/>
              </div>}

              {e.coffeeGrams>0&&e.yieldGrams>0&&<div className="lf-row" style={{cursor:"default"}}>
                <span className="lf-row-lbl">Ratio</span>
                <span className="lf-row-val" style={{fontFamily:"var(--mono)",color:"var(--accent)"}}>1:{(Number(e.yieldGrams)/Number(e.coffeeGrams)).toFixed(1)}</span>
              </div>}

              <button className="lf-row" onClick={()=>toggle("temp")}>
                <span className="lf-row-lbl">Water temp</span>
                <span className={`lf-row-val ${!e.waterTemp?"empty":""}`}>{e.waterTemp?`${e.waterTemp}°`:"Add"}<Chev open={openRow==="temp"}/></span>
              </button>
              {openRow==="temp"&&<div className="lf-row-content">
                <input className="lf-pick-search" style={{marginBottom:0}} type="number" inputMode="decimal" step="0.5" placeholder="e.g. 93 (°C) or 200 (°F)" value={e.waterTemp||""} onChange={ev=>s("waterTemp",ev.target.value)}/>
              </div>}

              <button className="lf-row" onClick={()=>toggle("time")}>
                <span className="lf-row-lbl">Brew time</span>
                <span className={`lf-row-val ${!e.extractionTime?"empty":""}`}>{e.extractionTime?`${e.extractionTime}`:"Add"}<Chev open={openRow==="time"}/></span>
              </button>
              {openRow==="time"&&<div className="lf-row-content">
                <div className="lf-pickgrid">{(TIME_PRESETS[e.method]||defaultTimePresets).map(t=><button key={t} className={`lf-pick ${e.extractionTime===t?"on":""}`} onClick={()=>{s("extractionTime",t);setOpenRow(null);}}>{t}</button>)}</div>
                <input className="lf-pick-search" style={{marginTop:12,marginBottom:0}} placeholder="Or enter exact time, e.g. 2:45" value={e.extractionTime||""} onChange={ev=>s("extractionTime",ev.target.value)}/>
              </div>}
            </div>
          </>}

          {/* ── NOTES & PHOTO ── */}
          <div className="lf-section-lbl">Notes</div>
          <button className="lf-row" onClick={()=>toggle("notes")}>
            <span className="lf-row-lbl">Tasting notes</span>
            <span className={`lf-row-val ${e.tastingNotes.length===0?"empty":""}`}>{e.tastingNotes.length>0?`${e.tastingNotes.length} added`:"Add"}<Chev open={openRow==="notes"}/></span>
          </button>
          {openRow==="notes"&&<div className="lf-row-content">
            <NotePicker value={e.tastingNotes} onChange={v=>s("tastingNotes",v)}/>
            {savedNotes.length>0&&<div style={{marginTop:14}}>
              <div style={{fontSize:11,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--accent)",marginBottom:8,fontFamily:"var(--sans)",fontWeight:500}}>Your notes</div>
              <div className="lf-pickgrid">{savedNotes.map(n=>{const on=e.tastingNotes.includes(n);return <button key={n} className={`lf-pick ${on?"on":""}`} onClick={()=>s("tastingNotes",on?e.tastingNotes.filter(x=>x!==n):[...e.tastingNotes,n])}>{n}</button>;})}</div>
            </div>}
            <input className="lf-pick-search" style={{marginTop:14,marginBottom:0}} placeholder="Add your own note…" value={e.customNote} onChange={ev=>s("customNote",ev.target.value)} onKeyDown={ev=>{if(ev.key==="Enter")addCustomNote(e.customNote);}}/>
          </div>}

          <button className="lf-row" onClick={()=>toggle("comment")}>
            <span className="lf-row-lbl">Comment</span>
            <span className={`lf-row-val ${!e.notes?"empty":""}`}>{e.notes?"Added":"Add"}<Chev open={openRow==="comment"}/></span>
          </button>
          {openRow==="comment"&&<div className="lf-row-content">
            <textarea className="lf-pick-search" style={{marginBottom:0,minHeight:80,resize:"vertical"}} placeholder="What did you taste? What would you change?" value={e.notes} onChange={ev=>s("notes",ev.target.value)}/>
          </div>}

          {/* Photo */}
          {photo
            ? <div className="lf-photo-row" onClick={()=>setPhoto(null)}>
                <img src={photo} className="lf-photo-thumb" alt=""/>
                <span className="lf-row-lbl" style={{flex:1}}>Photo added</span>
                <span style={{color:"var(--ink3)",fontSize:13,fontFamily:"'Inter',sans-serif"}}>Remove</span>
              </div>
            : <label className="lf-row" style={{cursor:"pointer"}}>
                <span className="lf-row-lbl">📷 Add a photo</span>
                <input type="file" accept="image/*" style={{display:"none"}} onChange={ev=>{const f=ev.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=x=>setPhoto(x.target.result);r.readAsDataURL(f);}}/>
              </label>
          }

          {/* Public toggle */}
          <button className="lf-row" onClick={()=>s("isPublic",!e.isPublic)} style={{borderBottom:e.isPublic?"1px solid var(--line)":"none"}}>
            <span className="lf-row-lbl">Contribute to community rankings</span>
            <span className="lf-row-val">{e.isPublic?"On":"Off"}<div style={{width:44,height:26,borderRadius:13,background:e.isPublic?"var(--accent)":"var(--border)",position:"relative",transition:"background 0.2s",marginLeft:4}}><div style={{position:"absolute",top:3,left:e.isPublic?21:3,width:20,height:20,borderRadius:"50%",background:"var(--surface)",transition:"left 0.2s"}}/></div></span>
          </button>
          {e.isPublic&&<div style={{padding:"16px 0 4px"}}>
            <div style={{fontSize:11,letterSpacing:"2px",textTransform:"uppercase",color:"var(--ink3)",marginBottom:10,fontFamily:"var(--sans)",fontWeight:500}}>Post as</div>
            <div className="lf-pickgrid">
              <button className={`lf-pick ${e.shareAs==="name"?"on":""}`} onClick={()=>s("shareAs","name")}>{currentUser?.name||"My name"}</button>
              <button className={`lf-pick ${e.shareAs==="anon"?"on":""}`} onClick={()=>s("shareAs","anon")}>Anonymous</button>
            </div>
            <div style={{fontSize:12,color:"var(--ink3)",fontFamily:"var(--sans)",marginTop:10,lineHeight:1.4}}>{e.shareAs==="anon"?"Your name won't appear — this log will show as “A coffee lover.”":"Your name will appear on this log in the community feed."}</div>
          </div>}

          </div>{/* lf-body */}
        </div>{/* lf-sheet */}

        {/* Save bar */}
        <div className="lf-save-bar" style={{padding:"0 26px"}}>
          <button className="lf-save" disabled={!e.drinkType} onClick={()=>{
            if(!e.drinkType){return;}
            onSave({...e,photo,id:Date.now(),userId:"me"});onClose();
          }}>{e.drinkType?"Save to journal":"Choose a drink type first"}</button>
        </div>
      </div>
    </div>
  );
}
function EntryDetail({ entry, onBack, onEdit }) {
  const drink=drinkInfo(entry.drinkType), roast=roastInfo(entry.roastLevel);
  const groups=groupNotes(entry.tastingNotes||[]);
  const user=SAMPLE_USERS.find(u=>u.id===entry.userId);
  return (
    <div className="det-wrap">
      <div className="det-hdr" style={{padding:0}}>
        {entry.photo&&<img src={entry.photo} className="photo-hero" alt="Coffee" style={{maxHeight:260}}/>}
        <div style={{padding:"16px 20px 18px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
          <button className="back-btn" onClick={onBack}>← Back</button>
          {onEdit&&<button className="back-btn" onClick={onEdit} style={{color:"var(--accent)"}}>Edit</button>}
        </div>
        <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
          <span className={`badge ${entry.type==="cafe"?"badge-cafe":"badge-home"}`}>{entry.type==="cafe"?"Café":"Home Brew"}</span>
          {drink&&<span className="badge" style={{background:"var(--surface2)",color:"var(--ink2)"}}>{drink.icon} {drinkLabel(entry)}</span>}
          {entry.isPublic&&<span className="badge badge-pub">Public</span>}
        </div>
        <div className="det-title">{entry.name||drinkLabel(entry)||"Coffee"}</div>
        {entry.roaster&&<div className="det-roaster">{entry.roaster}{entry.origin?` · ${entry.origin}`:""}</div>}
        {entry.scores&&<div style={{marginTop:8}}><ScoreDisplay scores={entry.scores} size="lg"/></div>}
        </div>
      </div>
      <div className="det-body">
        {user&&<div className="dsec"><div className="dsec-title">Logged by</div><div className="user-credit"><div className="user-av">{user.avatar}</div><div><div style={{fontSize:14,color:"var(--ink)",fontFamily:"'Inter',sans-serif",fontWeight:500}}>{user.name}</div><div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Fraunces',serif"}}>{user.entries} coffees logged</div></div></div></div>}
        {entry.scores&&<div className="dsec"><div className="dsec-title">Score Breakdown</div><DimScoreCard scores={entry.scores}/></div>}
        {entry.notes&&<div className="dsec"><div className="dsec-title">Tasting Notes</div><div className="quote-block">"{entry.notes}"</div></div>}
        {entry.tastingNotes?.length>0&&<div className="dsec"><div className="dsec-title">Flavour Profile</div>
          {Object.entries(groups).map(([fam,ns])=>{const def=NOTE_FAMILIES[fam]||{color:"#888",bg:"#f5f5f5",border:"#ddd"};return <div key={fam} className="fam-row"><div className="fam-label" style={{color:def.color}}>{fam}</div><div className="fam-pills">{ns.map(n=><span key={n} className="npill" style={{background:def.bg,color:def.color,border:`1px solid ${def.border}`}}>{n}</span>)}</div></div>;})}
        </div>}
        <div className="dsec"><div className="dsec-title">The Bean</div><div className="dgrid">
          {entry.origin&&<div className="ditem"><div className="ditem-l">Origin</div><div className="ditem-v">{entry.origin}</div></div>}
          {roast&&<div className="ditem"><div className="ditem-l">Roast</div><div className="ditem-v">{roast.label}</div></div>}
          {entry.process&&<div className="ditem"><div className="ditem-l">Process</div><div className="ditem-v">{entry.process}</div></div>}
          {entry.roaster&&<div className="ditem"><div className="ditem-l">Roaster</div><div className="ditem-v">{entry.roaster}</div></div>}
{entry.beanFreshness&&(()=>{
            const fm={fresh:{label:"Fresh",desc:"< 7 days",col:"#5a3800"},peak:{label:"Peak",desc:"7–21 days",col:"#2d5a38"},past_peak:{label:"Past Peak",desc:"21–35 days",col:"#5a3e28"},stale:{label:"Stale",desc:"35+ days",col:"#7a2020"},unknown:{label:"Unknown",desc:"",col:"var(--ink3)"}};
            const f=fm[entry.beanFreshness]||fm.unknown;
            return <div className="ditem" style={{borderColor:f.col+"40"}}><div className="ditem-l">Freshness</div><div className="ditem-v" style={{color:f.col}}>{f.label}<span style={{fontSize:11,color:"var(--ink3)",marginLeft:4}}>{f.desc}</span></div></div>;
          })()}
        </div></div>
        {(entry.method||entry.machine)&&<div className="dsec"><div className="dsec-title">Brew</div><div className="dgrid">
          {entry.method&&<div className="ditem"><div className="ditem-l">Method</div><div className="ditem-v">{entry.method}</div></div>}
          {entry.machine&&<div className="ditem"><div className="ditem-l">Machine</div><div className="ditem-v">{entry.machine}</div></div>}
          {entry.grinder&&<div className="ditem"><div className="ditem-l">Grinder</div><div className="ditem-v">{entry.grinder}</div></div>}
          {entry.grindSetting&&<div className="ditem"><div className="ditem-l">Grind</div><div className="ditem-v">{entry.grindSetting}</div></div>}
          {entry.water&&<div className="ditem"><div className="ditem-l">Water</div><div className="ditem-v">{entry.water}</div></div>}
          {entry.waterTemp&&<div className="ditem"><div className="ditem-l">Temp</div><div className="ditem-v">{entry.waterTemp}°C</div></div>}
          {entry.coffeeGrams&&<div className="ditem"><div className="ditem-l">Dose</div><div className="ditem-v">{entry.coffeeGrams}g</div></div>}
          {entry.yieldGrams&&<div className="ditem"><div className="ditem-l">Yield</div><div className="ditem-v">{entry.yieldGrams}{entry.method?.includes("Espresso")?"g":"ml"}</div></div>}
          {entry.extractionTime&&<div className="ditem"><div className="ditem-l">Time</div><div className="ditem-v">{entry.extractionTime}s</div></div>}
        </div></div>}
        {entry.type==="cafe"&&(entry.cafeName||entry.cafeLocation)&&<div className="dsec"><div className="dsec-title">Where</div><div className="dgrid">
          {entry.cafeName&&<div className="ditem"><div className="ditem-l">Café</div><div className="ditem-v">{entry.cafeName}</div></div>}
          {entry.cafeRating!=null&&<div className="ditem"><div className="ditem-l">Café rating</div><div className="ditem-v" style={{color:"var(--accent)",fontWeight:600}}>{Number(entry.cafeRating).toFixed(1)}<span style={{color:"var(--ink3)",fontWeight:400,fontSize:12}}>/10</span></div></div>}
          {entry.cafeTags&&entry.cafeTags.length>0&&<div className="ditem" style={{gridColumn:"1/-1"}}><div className="ditem-l">Tags</div><div style={{display:"flex",flexWrap:"wrap",gap:8,marginTop:4}}>{entry.cafeTags.map(t=><span key={t} style={{fontFamily:"var(--sans)",fontSize:12,color:"var(--ink2)",borderBottom:"1.5px solid var(--accent)",paddingBottom:1}}>{t}</span>)}</div></div>}
          {entry.cafeLocation&&<a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(entry.cafeName+" "+entry.cafeLocation)}`} target="_blank" rel="noopener noreferrer" style={{display:"flex",alignItems:"center",gap:6,padding:"8px 12px",background:"var(--blue-light)",border:"1.5px solid #bcd0e8",borderRadius:"var(--rsm)",marginTop:8,textDecoration:"none",color:"var(--navy)",fontFamily:"'Inter',sans-serif",fontSize:12}}>📍 View on Google Maps →</a>}
          {entry.cafeLocation&&<div className="ditem"><div className="ditem-l">Location</div><div className="ditem-v">{entry.cafeLocation}</div></div>}
        </div></div>}
        <div style={{textAlign:"center",marginTop:8}}><span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"var(--ink3)"}}>{fmtDate(entry.date)}</span></div>
      </div>
    </div>
  );
}

// ─── RECIPE DETAIL ────────────────────────────────────────────────────────────
function RecipeDetail({ recipe, onBack }) {
  return (
    <div className="det-wrap">
      <div className="det-hdr">
        <button className="back-btn" onClick={onBack}>← Recipes</button>
        <div style={{fontSize:38,marginBottom:8}}>{recipe.icon}</div>
        <div className="det-title">{recipe.name}</div>
        <div style={{fontSize:13,color:"var(--ink3)",marginTop:4,fontFamily:"'Fraunces',serif"}}>{recipe.ratio} · {recipe.time} · {recipe.yield}</div>
      </div>
      <div className="det-body">
        <div className="dsec"><div className="dsec-title">Parameters</div><div className="rec-params">{Object.entries(recipe.params).map(([k,v])=><div key={k} className="ditem"><div className="ditem-l">{k}</div><div className="ditem-v">{v}</div></div>)}</div></div>
        <div className="dsec"><div className="dsec-title">Steps</div>{recipe.steps.map((step,i)=><div key={i} className="rec-step"><div className="step-num">{i+1}</div><div className="step-txt">{step}</div></div>)}</div>
      </div>
    </div>
  );
}

// ─── ROASTER DETAIL ───────────────────────────────────────────────────────────
function RoasterDetail({ roaster, palateProfile, onBack }) {
  const rl={light:"Light",light_med:"Light–Med",medium:"Medium",med_dark:"Med–Dark",dark:"Dark"};
  const match=matchRoaster(palateProfile,roaster);
  const score=match.best;
  const allBeans=match.allBeans||[];
  return (
    <div className="det-wrap">
      <div className="det-hdr">
        <button className="back-btn" onClick={onBack}>← Roasters</button>
        <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
          {roaster.verified&&<span className="verified-badge">✓ Verified</span>}
          <span className="badge" style={{background:"var(--surface2)",color:"var(--ink2)"}}>{roaster.city}, {roaster.country}</span>
        </div>
        <div className="det-title">{roaster.name}</div>
        <div className="det-roaster">{roaster.neighbourhood}</div>
        <div style={{fontSize:13,color:"var(--ink2)",fontFamily:"'Inter',sans-serif"}}>{roaster.rating} ★ · {roaster.url}</div>
      </div>
      <div className="det-body">
        {/* Match summary */}
        <div className="dsec"><div className="dsec-title">Your Palate Match</div>
          <div style={{background:"var(--surface)",borderRadius:"var(--r)",padding:"14px 16px",border:"1.5px solid var(--border)",display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,marginBottom:8}}>
            <div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"var(--ink)",textShadow:"none",marginBottom:2}}>Best bean match</div>
              <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Fraunces',serif",fontStyle:"italic"}}>Avg across all their coffees: {match.avg}%</div>
            </div>
            <div style={{textAlign:"right"}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:30,color:score>=75?"var(--sage)":score>=50?"var(--navy)":"var(--ink3)",textShadow:"none",lineHeight:1}}>{score}%</div>
            </div>
          </div>
          <div className="bar-track" style={{height:6,marginBottom:6}}><div className="bar-fill" style={{width:`${score}%`}}/></div>
          <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Fraunces',serif",fontStyle:"italic"}}>{score>=80?"Strong match — their range aligns closely with your palate.":score>=60?"Good match — you'll find coffees you love here.":"Exploratory — their style differs, which could broaden your palate."}</div>
        </div>

        {/* About */}
        <div className="dsec"><div className="dsec-title">About</div>
          <div style={{fontSize:14,color:"var(--ink2)",lineHeight:1.6,background:"var(--surface)",borderRadius:"var(--rsm)",padding:"12px 14px",border:"1.5px solid var(--border)",fontFamily:"'Fraunces',serif"}}>{roaster.speciality}</div>
        </div>

        {/* Bean by bean matches */}
        <div className="dsec">
          <div className="dsec-title">Their Coffees — Matched to You</div>
          {allBeans.map((bean,i)=>{
            const topFams=Object.entries(bean.profile).sort((a,b)=>b[1]-a[1]).slice(0,3);
            const roastLabel=rl[bean.roast]||bean.roast;
            return (
              <div key={bean.id} style={{background:"var(--surface)",borderRadius:"var(--r)",border:`1.5px solid ${bean.score>=75?"#a8c8a8":bean.score>=50?"#bcd0e8":"var(--border)"}`,padding:"13px 14px",marginBottom:10}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",gap:10,marginBottom:6}}>
                  <div style={{flex:1}}>
                    {i===0&&<div style={{fontSize:9,fontFamily:"'Inter',sans-serif",letterSpacing:"1.5px",color:"var(--sage)",textTransform:"uppercase",marginBottom:3}}>Best match</div>}
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:15,color:"var(--ink)",textShadow:"none",marginBottom:2}}>{bean.name}</div>
                    <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Fraunces',serif"}}>{bean.origin} · {roastLabel} · {bean.process}</div>
                  </div>
                  <div style={{background:bean.score>=75?"var(--sage)":bean.score>=50?"var(--navy)":"var(--border2)",borderRadius:10,padding:"5px 10px",textAlign:"center",flexShrink:0}}>
                    <div style={{fontFamily:"'Fraunces',serif",fontSize:18,color:"#fff",lineHeight:1}}>{bean.score}%</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:"rgba(255,255,255,0.6)",letterSpacing:"0.5px"}}>match</div>
                  </div>
                </div>
                <div style={{display:"flex",flexWrap:"wrap",gap:4,marginBottom:6}}>
                  {topFams.map(([fam])=>{const def=NOTE_FAMILIES[fam]||{color:"#888",bg:"#f5f5f5",border:"#ddd"};return <span key={fam} className="npill" style={{background:def.bg,color:def.color,border:`1px solid ${def.border}`,fontSize:10,padding:"2px 7px"}}>{fam}</span>;})}
                </div>
                <div style={{fontSize:12,color:"var(--ink3)",fontFamily:"'Fraunces',serif",fontStyle:"italic",marginBottom:bean.price?4:0}}>{bean.notes}</div>
                {bean.price&&<div style={{fontSize:11,fontFamily:"'DM Mono',monospace",color:"var(--ink3)"}}>{bean.price}</div>}
                <div style={{marginTop:8,height:4,background:"var(--border)",borderRadius:2,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${bean.score}%`,background:bean.score>=75?"var(--sage)":bean.score>=50?"var(--navy)":"var(--border2)",borderRadius:2,transition:"width 0.4s ease"}}/>
                </div>
              </div>
            );
          })}
        </div>

        {/* Roast styles */}
        <div className="dsec"><div className="dsec-title">Roast Range</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>{roaster.styles.map(s=><span key={s} className="roaster-style">{rl[s]||s}</span>)}</div>
        </div>
      </div>
    </div>
  );
}

// ─── STATS VIEW ───────────────────────────────────────────────────────────────
// ─── BADGES ───────────────────────────────────────────────────────────────────
const GROUP_COLOR = { Exploration:"#6E7B5E", Craft:"#A85436", Journey:"#B08328", Community:"#4A6C8C" };

// Each badge computes {earned, current, target, hint} from the user's entries.
function computeBadges(entries) {
  const E = entries||[];
  const has = E.length>0;
  const distinct = (fn) => new Set(E.map(fn).filter(Boolean).map(x=>String(x).trim().toLowerCase())).size;
  const count = (fn) => E.filter(fn).length;
  const overall = e => { const s=e.scores||{}; const w={aroma:.25,flavour:.35,mouthfeel:.15,finish:.25}; let sum=0,wt=0; for(const k in w){if(s[k]){sum+=s[k]*w[k];wt+=w[k];}} return wt?sum/wt:0; };
  const isFullRecipe = e => e.coffeeGrams&&e.yieldGrams&&e.waterTemp&&e.extractionTime;
  const isDetailed = e => { const s=e.scores||{}; return [s.aroma,s.flavour,s.mouthfeel,s.finish].filter(v=>v!=null).length>=4; };
  const weeks = new Set(E.map(e=>{ const d=new Date(e.date); if(isNaN(d))return null; const onejan=new Date(d.getFullYear(),0,1); return d.getFullYear()+"-"+Math.ceil((((d-onejan)/86400000)+onejan.getDay()+1)/7); }).filter(Boolean)).size;
  // same coffee logged 3+ times
  const nameCounts = {}; E.forEach(e=>{ if(e.name){const k=e.name.trim().toLowerCase(); nameCounts[k]=(nameCounts[k]||0)+1;} });
  const maxSameCoffee = Object.values(nameCounts).reduce((a,b)=>Math.max(a,b),0);
  // roast spectrum
  const roasts = new Set(E.map(e=>e.roastLevel).filter(Boolean));
  const publicCount = count(e=>e.isPublic);
  const cafeRated = distinct(e=>e.cafeRating!=null?e.cafeName:null);
  const cities = distinct(e=>e.cafeCity);

  const tiered = (name,group,current,tiers,unit) => {
    // tiers ascending; earned at first tier, tier label = highest passed
    let earnedTier=0; tiers.forEach((t,i)=>{ if(current>=t) earnedTier=i+1; });
    const earned = earnedTier>0;
    const nextTier = tiers[earnedTier] ?? null;
    const roman=["I","II","III","IV"];
    return { name, group, earned, tier: earned&&tiers.length>1?roman[earnedTier-1]:null,
      current, target: nextTier ?? tiers[tiers.length-1],
      hint: nextTier?`Next: ${nextTier} ${unit}`:null };
  };
  const simple = (name,group,current,target,unit,doneHint) => ({
    name, group, earned: current>=target, current, target,
    hint: current>=target?null:(doneHint||`${target-current} more`) });

  return [
    // Exploration (sage)
    tiered("Passport","Exploration",distinct(e=>e.origin||e.customOrigin),[5,10,15,20],"countries"),
    tiered("Roaster Tour","Exploration",distinct(e=>e.roaster),[5,15,30],"roasters"),
    tiered("Method Master","Exploration",distinct(e=>e.method),[5,8],"methods"),
    { name:"Process Curious", group:"Exploration", ...(()=>{ const p=new Set(E.map(e=>e.process).filter(Boolean).map(x=>x.toLowerCase())); const cur=["washed","natural","honey"].filter(x=>p.has(x)).length + (p.size>3?1:0); return { earned:cur>=4, current:Math.min(cur,4), target:4, hint:cur>=4?null:"Try more processes" }; })() },
    simple("Single Origin Purist","Exploration",count(e=>e.origin&&(!e.name||!/blend/i.test(e.name))),10,"single origins"),
    tiered("Explorer","Exploration",E.length,[25],"logged"),
    // Craft (terracotta)
    simple("Recipe Keeper","Craft",count(isFullRecipe),10,"full recipes"),
    { name:"Dialed In", group:"Craft", earned:maxSameCoffee>=3, current:Math.min(maxSameCoffee,3), target:3, hint:maxSameCoffee>=3?null:"Log the same coffee 3×" },
    simple("Discerning Palate","Craft",count(isDetailed),25,"detailed ratings"),
    simple("Ratio Master","Craft",count(e=>e.coffeeGrams&&e.yieldGrams),10,"brews with ratio"),
    simple("Home Barista","Craft",count(e=>e.type==="home"),25,"home brews"),
    // Journey (gold)
    { name:"First Pour", group:"Journey", earned:has, current:has?1:0, target:1, hint:null },
    simple("Regular","Journey",weeks,4,"weeks"),
    simple("Devoted","Journey",E.length,50,"logged"),
    simple("Centurion","Journey",E.length,100,"logged"),
    // Community (blue)
    { name:"Contributor", group:"Community", earned:publicCount>=1, current:Math.min(publicCount,1), target:1, hint:publicCount>=1?null:"Share your first log" },
    simple("Tastemaker","Community",publicCount,10,"public logs"),
    simple("Café Critic","Community",cafeRated,10,"cafés rated"),
    simple("Local Guide","Community",cities,3,"cities"),
  ];
}

function BadgeRing({ badge, size=46 }) {
  const color = GROUP_COLOR[badge.group];
  return (
    <div style={{width:size,height:size,borderRadius:"50%",flexShrink:0,border:`1.5px solid ${badge.earned?color:"var(--line)"}`,background:badge.earned?color:"transparent",display:"flex",alignItems:"center",justifyContent:"center",position:"relative"}}>
      <span style={{fontFamily:"var(--serif)",fontSize:size*0.4,fontStyle:"italic",color:badge.earned?"var(--surface)":"var(--ink3)",lineHeight:1}}>{badge.name[0]}</span>
      {badge.tier&&badge.earned&&<span style={{position:"absolute",bottom:-2,right:-2,width:18,height:18,borderRadius:"50%",background:"var(--surface)",border:`1px solid ${color}`,color,fontFamily:"var(--mono)",fontSize:9,display:"flex",alignItems:"center",justifyContent:"center"}}>{badge.tier}</span>}
    </div>
  );
}

function BadgesPanel({ entries }) {
  const badges = useMemo(()=>computeBadges(entries),[entries]);
  const earnedCount = badges.filter(b=>b.earned).length;
  const groups = ["Exploration","Craft","Journey","Community"];
  return (
    <div>
      <div style={{fontFamily:"var(--sans)",fontSize:13,color:"var(--ink3)",marginBottom:24}}>{earnedCount} of {badges.length} earned</div>
      {groups.map(g=>{
        const items = badges.filter(b=>b.group===g);
        const color = GROUP_COLOR[g];
        const got = items.filter(b=>b.earned).length;
        return (
          <div key={g} style={{marginBottom:30}}>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:color}}/>
                <span style={{fontSize:11,letterSpacing:"2px",textTransform:"uppercase",color,fontWeight:600,fontFamily:"var(--sans)"}}>{g}</span>
              </div>
              <span style={{fontFamily:"var(--mono)",fontSize:11,color:"var(--ink3)"}}>{got}/{items.length}</span>
            </div>
            <div>
              {items.map(b=>(
                <div key={b.name} style={{display:"flex",alignItems:"center",gap:16,padding:"13px 0",borderBottom:"1px solid var(--line)",opacity:b.earned?1:0.68}}>
                  <BadgeRing badge={b}/>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{fontFamily:"var(--serif)",fontSize:16,color:b.earned?"var(--ink)":"var(--ink2)"}}>{b.name}{b.tier&&b.earned?` ${b.tier}`:""}</div>
                    {!b.earned&&b.hint&&<div style={{fontFamily:"var(--sans)",fontSize:11,color,marginTop:3}}>{b.hint}</div>}
                  </div>
                  {!b.earned&&b.target>1&&<div style={{fontFamily:"var(--mono)",fontSize:12,color:"var(--ink3)",flexShrink:0}}>{b.current} / {b.target}</div>}
                  {b.earned&&<div style={{fontFamily:"var(--sans)",fontSize:10,letterSpacing:"1px",textTransform:"uppercase",color,flexShrink:0}}>Earned</div>}
                </div>
              ))}
            </div>
          </div>
        );
      })}
      <div style={{fontFamily:"var(--serif)",fontSize:13,fontStyle:"italic",color:"var(--ink3)",textAlign:"center",lineHeight:1.5,paddingTop:4}}>Badges celebrate range and craft — where you've explored, not how much you've consumed.</div>
    </div>
  );
}

function StatsView({ entries, currentUser, isPro=false, onUpgrade }) {
  const [tab,setTab]=useState("overview");
  const palate=useMemo(()=>buildPalateProfile(entries),[entries]);
  const topFam=FAM_KEYS.reduce((a,k)=>palate[k]>palate[a]?k:a,FAM_KEYS[0]);
  const topTwo=FAM_KEYS.slice().sort((a,b)=>palate[b]-palate[a]).slice(0,2);
  const recs=useMemo(()=>BEAN_CATALOGUE.map(b=>({...b,score:matchScore(palate,b.profile)})).sort((a,b)=>b.score-a.score).slice(0,6),[palate]);

  if(!entries.length) return <div className="empty"><span className="empty-icon">📊</span><div className="empty-t">No data yet</div><div className="empty-s">Log a few coffees with scores and tasting notes to unlock your palate profile and bean recommendations.</div></div>;

  const dimAvgs={};
  RATING_DIMS.forEach(d=>{ const v=entries.filter(e=>e.scores?.[d.id]).map(e=>e.scores[d.id]); dimAvgs[d.id]=v.length?fmt1(v.reduce((a,b)=>a+b,0)/v.length):null; });
  const overallAvg=fmt1(entries.filter(e=>e.scores).map(e=>computeOverall(e.scores)).reduce((a,b)=>a+b,0)/Math.max(entries.filter(e=>e.scores).length,1));

  const home=entries.filter(e=>e.type==="home").length, cafe=entries.filter(e=>e.type==="cafe").length;
  const mC={},oC={},pC={};
  entries.forEach(e=>{ if(e.method)mC[e.method]=(mC[e.method]||0)+1; if(e.origin)oC[e.origin]=(oC[e.origin]||0)+1; if(e.process)pC[e.process]=(pC[e.process]||0)+1; });
  const topM=Object.entries(mC).sort((a,b)=>b[1]-a[1]).slice(0,5);
  const topO=Object.entries(oC).sort((a,b)=>b[1]-a[1]).slice(0,6);
  const topP=Object.entries(pC).sort((a,b)=>b[1]-a[1]).slice(0,4);
  const mMax=Math.max(...topM.map(x=>x[1]),1);

  const oR={};
  entries.forEach(e=>{ if(e.origin&&e.scores){ if(!oR[e.origin])oR[e.origin]=[]; oR[e.origin].push(computeOverall(e.scores)); }});
  const topOR=Object.entries(oR).map(([k,v])=>[k,fmt1(v.reduce((a,b)=>a+b,0)/v.length)]).sort((a,b)=>Number(b[1])-Number(a[1])).slice(0,6);

  const recent=[...entries].sort((a,b)=>new Date(a.date)-new Date(b.date)).slice(-8).filter(e=>e.scores);
  const nC={};
  entries.forEach(e=>e.tastingNotes?.forEach(n=>{nC[n]=(nC[n]||0)+1;}));
  const topN=Object.entries(nC).sort((a,b)=>b[1]-a[1]).slice(0,14);
  const famScores=FAM_KEYS.map(k=>({k,v:palate[k]||0})).sort((a,b)=>b.v-a.v);
  const rlC={};
  entries.forEach(e=>{ if(e.roastLevel)rlC[e.roastLevel]=(rlC[e.roastLevel]||0)+1; });

  const trendW=300,trendH=60;
  const trendPts=recent.map((e,i,arr)=>{ const x=(i/Math.max(arr.length-1,1))*(trendW-20)+10; const y=trendH-((computeOverall(e.scores)/10)*(trendH-12))-6; return [x,y,computeOverall(e.scores)]; });
  const trendPath=trendPts.map((p,i)=>`${i===0?"M":"L"}${p[0]},${p[1]}`).join(" ");

  const sortedDims=RATING_DIMS.filter(d=>dimAvgs[d.id]).sort((a,b)=>dimAvgs[b.id]-dimAvgs[a.id]);
  const bestDim=sortedDims[0], weakDim=sortedDims[sortedDims.length-1];

  // ── Personal Rankings ──────────────────────────────────────────────────
  // Top cafés from my logs
  const myCafeMap={};
  entries.filter(e=>e.type==="cafe"&&e.cafeName&&e.scores).forEach(e=>{
    const key=e.cafeName.trim();
    if(!myCafeMap[key]) myCafeMap[key]={name:key,location:e.cafeLocation||"",logs:[],notes:[]};
    myCafeMap[key].logs.push(computeOverall(e.scores));
    (e.tastingNotes||[]).forEach(n=>myCafeMap[key].notes.push(n));
  });
  const topMyCafes=Object.values(myCafeMap)
    .map(c=>({...c,avg:fmt1(c.logs.reduce((a,b)=>a+b,0)/c.logs.length),visits:c.logs.length}))
    .sort((a,b)=>b.avg-a.avg).slice(0,10);

  // Top roasters from my logs
  const myRoasterMap={};
  entries.filter(e=>e.roaster&&e.scores).forEach(e=>{
    const key=e.roaster.trim();
    if(!myRoasterMap[key]) myRoasterMap[key]={name:key,logs:[],origins:[],notes:[]};
    myRoasterMap[key].logs.push(computeOverall(e.scores));
    if(e.origin) myRoasterMap[key].origins.push(e.origin);
    (e.tastingNotes||[]).forEach(n=>myRoasterMap[key].notes.push(n));
  });
  const topMyRoasters=Object.values(myRoasterMap)
    .map(r=>({...r,avg:fmt1(r.logs.reduce((a,b)=>a+b,0)/r.logs.length),coffees:r.logs.length}))
    .sort((a,b)=>b.avg-a.avg).slice(0,10);

  // Top coffees (individual entries)
  const topMyCoffees=[...entries].filter(e=>e.scores&&(e.name||e.drinkType))
    .sort((a,b)=>computeOverall(b.scores)-computeOverall(a.scores)).slice(0,10);

  return (
    <>
      {currentUser&&<div className="prof-card">
        <div className="prof-av">{currentUser.avatar}</div>
        <div style={{flex:1}}>
          <div className="prof-name">{currentUser.name}</div>
          <div className="prof-meta">Million Coffees member</div>
          <div className="prof-stats">
            <div><div className="pstat-n">{entries.length}</div><div className="pstat-l">Logged</div></div>
            <div><div className="pstat-n">{overallAvg}</div><div className="pstat-l">Avg Score</div></div>
            <div><div className="pstat-n">{entries.filter(e=>e.isPublic).length}</div><div className="pstat-l">Public</div></div>
          </div>
        </div>
      </div>}
      <div className="section-tabs">
        {[["overview","Overview"],["badges","Badges"],["palate","My Palate"],["recs","Bean Matches"]].map(([id,label])=>(
          <button key={id} className={`stab ${tab===id?"active":""}`} onClick={()=>setTab(id)} style={{position:"relative"}}>
            {label}
            {!isPro&&(id==="palate"||id==="recs")&&<span style={{position:"absolute",top:-4,right:-4,fontSize:8,background:"var(--rose)",color:"#fff",borderRadius:10,padding:"1px 4px",fontFamily:"'Inter',sans-serif"}}>Pro</span>}
          </button>
        ))}
      </div>

      {tab==="overview"&&<>
        <div className="stats-grid">
          <div className="stat-card"><div className="stat-big">{entries.length}</div><div className="stat-desc">Coffees logged</div></div>
          <div className="stat-card"><div className="stat-big">{overallAvg}</div><div className="stat-desc">Avg score / 10</div></div>
          <div className="stat-card"><div className="stat-big">{home}</div><div className="stat-desc">Home brews</div></div>
          <div className="stat-card"><div className="stat-big">{cafe}</div><div className="stat-desc">Café visits</div></div>
        </div>
        {sortedDims.length>0&&<div className="bar-card"><div className="bar-card-title">Avg Score by Dimension</div><div className="bar-card-sub">How you score each aspect across all coffees</div>
          {RATING_DIMS.map(d=>dimAvgs[d.id]!=null&&<div key={d.id} style={{display:"flex",alignItems:"center",gap:9,marginBottom:8}}>
            <div style={{width:68,fontSize:11,color:DIM_COLORS[d.id],fontFamily:"'Inter',sans-serif",fontWeight:500,flexShrink:0}}>{d.label}</div>
            <div style={{flex:1,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}><div style={{height:"100%",width:`${(dimAvgs[d.id]/10)*100}%`,background:DIM_COLORS[d.id],borderRadius:3,opacity:0.85}}/></div>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:16,color:DIM_COLORS[d.id],width:28,textAlign:"right",fontWeight:600}}>{dimAvgs[d.id]}</div>
          </div>)}
        </div>}
        {bestDim&&weakDim&&bestDim.id!==weakDim.id&&<div className="insight-banner">
          <div className="insight-title">Dimension insight</div>
          <div className="insight-body">Your highest dimension is <strong>{bestDim.label}</strong> ({dimAvgs[bestDim.id]}/10). Your lowest is <strong>{weakDim.label}</strong> ({dimAvgs[weakDim.id]}/10) — worth seeking coffees specifically noted for it.</div>
        </div>}
        {trendPts.length>=3&&<div className="bar-card"><div className="bar-card-title">Score Trend</div><div className="bar-card-sub">Your last {trendPts.length} scored coffees</div>
          <svg width="100%" viewBox={`0 0 ${trendW} ${trendH}`} style={{overflow:"visible",margin:"4px 0"}}>
            <defs><linearGradient id="tg" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#1a2f5e" stopOpacity="0.2"/><stop offset="100%" stopColor="#1a2f5e" stopOpacity="0"/></linearGradient></defs>
            <path d={`${trendPath} L${trendPts[trendPts.length-1][0]},${trendH} L${trendPts[0][0]},${trendH}Z`} fill="url(#tg)"/>
            <path d={trendPath} fill="none" stroke="#1a2f5e" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
            {trendPts.map(([x,y,r],i)=><g key={i}><circle cx={x} cy={y} r="4" fill="var(--surface)" stroke="#1a2f5e" strokeWidth="2"/><text x={x} y={y-8} textAnchor="middle" fontSize="9" fontFamily="DM Mono,monospace" fill="#7a6a50">{r}</text></g>)}
          </svg>
        </div>}
        {topM.length>0&&<div className="bar-card"><div className="bar-card-title">Brew Methods</div>{topM.map(([m,c])=><div key={m} className="bar-row"><div className="bar-lbl">{m.replace(" Machine","").replace(" Press"," P.")}</div><div className="bar-track"><div className="bar-fill" style={{width:`${(c/mMax)*100}%`}}/></div><div className="bar-n">{c}</div></div>)}</div>}
        {topOR.length>0&&<div className="bar-card"><div className="bar-card-title">Avg Score by Origin</div><div className="bar-card-sub">Composite score across all 4 dimensions</div>{topOR.map(([o,avgR])=><div key={o} className="bar-row"><div className="bar-lbl">{o}</div><div className="bar-track"><div className="bar-fill" style={{width:`${(Number(avgR)/10)*100}%`}}/></div><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"var(--ink3)",width:28,flexShrink:0}}>{avgR}</div></div>)}</div>}
        {topP.length>0&&<div className="bar-card">
          <div className="bar-card-title">Processing Methods</div>
          <div className="bar-card-sub">How your beans were processed</div>
          {topP.map(([p,c])=>{
            const pMax=Math.max(...topP.map(x=>x[1]),1);
            const procCols={"Washed":"#1a2f5e","Natural":"#c4622d","Honey":"#a87e28","Anaerobic Natural":"#8b2020","Anaerobic Washed":"#2d5a38","Extended Fermentation":"#5a1e6e","Carbonic Maceration":"#1e5a6e","Wet-Hulled":"#6e5638"};
            const col=procCols[p]||"var(--navy)";
            return <div key={p} className="bar-row">
              <div className="bar-lbl" style={{fontSize:10}}>{p.split(" ").slice(0,2).join(" ")}</div>
              <div className="bar-track"><div style={{height:"100%",width:`${(c/pMax)*100}%`,background:col,borderRadius:3,opacity:0.8}}/></div>
              <div className="bar-n">{c}</div>
            </div>;
          })}
        </div>}
        {Object.keys(rlC).length>0&&<div className="bar-card">
          <div className="bar-card-title">Roast Levels</div>
          <div className="bar-card-sub">Distribution across your logged coffees</div>
          {ROAST_LEVELS.filter(rl=>rlC[rl.id]).map(rl=>{
            const pct=Math.round(((rlC[rl.id]||0)/Math.max(...Object.values(rlC),1))*100);
            const cols={light:"#c4622d",light_med:"#a87e28",medium:"#6e5638",med_dark:"#3e2d22",dark:"#1a1510"};
            return <div key={rl.id} className="bar-row">
              <div className="bar-lbl">{rl.label}</div>
              <div className="bar-track"><div style={{height:"100%",width:`${pct}%`,background:cols[rl.id]||"var(--navy)",borderRadius:3,opacity:0.8}}/></div>
              <div className="bar-n">{rlC[rl.id]}</div>
            </div>;
          })}
        </div>}
      </>}

      {tab==="badges"&&<BadgesPanel entries={entries}/>}

      {tab==="palate"&&(!isPro
        ?<PaywallGate feature="Your Palate Profile" reason="See a visual radar chart of your flavour fingerprint, your dominant families, and how your tastes have shifted over time." onUpgrade={onUpgrade}/>
        :<>
        <div className="radar-card"><div className="radar-title">Your Palate Profile</div><div className="radar-sub">Weighted by score — higher-scored coffees shape your profile more. {entries.length} entries.</div><RadarChart profile={palate} size={240}/></div>
        <div className="insight-banner"><div className="insight-title">Dominant family: {topFam}</div><div className="insight-body">You gravitate towards <strong>{topTwo.join(" and ")}</strong> flavours. Look for {topTwo[0]==="Fruit"?"naturals and anaerobic-process beans":topTwo[0]==="Floral"?"light-roasted washed Ethiopians and Geshas":topTwo[0]==="Sweet"?"honey-processed and medium-roasted beans":topTwo[0]==="Nutty"?"Brazilian naturals and medium roasts":topTwo[0]==="Roast"?"medium-dark and dark roasts":"Indonesian and Yemeni origins"} to satisfy your palate.</div></div>
        <div className="bar-card"><div className="bar-card-title">Flavour Family Scores</div><div className="bar-card-sub">Each score out of 10, weighted by your composite score</div>{famScores.map(({k,v})=><FamilyBar key={k} family={k} value={v}/>)}</div>
        {topN.length>0&&<div className="bar-card"><div className="bar-card-title">Your Most-Noted Flavours</div><div className="bar-card-sub">Size reflects how often you log each note</div><div style={{display:"flex",flexWrap:"wrap",gap:5,marginTop:4}}>{topN.map(([n,c])=>{const fam=NOTE_TO_FAM[n];const def=NOTE_FAMILIES[fam]||{color:"#888",bg:"#f5f5f5",border:"#ddd"};return <span key={n} className="npill" style={{background:def.bg,color:def.color,border:`1px solid ${def.border}`,fontSize:11+Math.min(c*1.5,6),padding:`${3+Math.min(c,2)}px ${9+Math.min(c,3)}px`}}>{n}</span>;})}</div></div>}
        {topOR.length>0&&<div className="bar-card"><div className="bar-card-title">Your Preferred Origins</div><div className="bar-card-sub">Ranked by average composite score</div>{topOR.map(([o,avgR])=><div key={o} className="bar-row"><div className="bar-lbl">{o}</div><div className="bar-track"><div className="bar-fill" style={{width:`${(Number(avgR)/10)*100}%`}}/></div><div style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:"var(--ink3)",width:28,flexShrink:0}}>{avgR}</div></div>)}</div>}
      </>
      )}

      {tab==="recs"&&(!isPro
        ?<PaywallGate feature="Bean Recommendations" reason="Get personalised bean matches based on your palate profile — ranked by cosine similarity across all 6 flavour families." onUpgrade={onUpgrade}/>
        :<>
        <div className="section-hdr"><div className="section-title">Beans for You</div><div className="section-sub">Matched by cosine similarity across all 6 flavour families</div></div>
        <div className="insight-banner" style={{marginBottom:14}}><div className="insight-title">How this works</div><div className="insight-body">Every scored coffee refines your palate vector. Higher-scored coffees contribute more weight. The match percentage compares your vector against each bean's flavour fingerprint.</div></div>
        {recs.map((bean,i)=>{
          const topFams=Object.entries(bean.profile).sort((a,b)=>b[1]-a[1]).slice(0,3);
          return (
            <div key={bean.id} className="rec-bean-card">
              <div className="rec-bean-top">
                <div style={{flex:1}}>
                  {i===0&&<div style={{fontFamily:"'Inter',sans-serif",fontSize:9,color:"var(--sage)",letterSpacing:"0.8px",marginBottom:4,fontWeight:600}}>TOP MATCH</div>}
                  <div className="rec-bean-name">{bean.name}</div>
                  <div className="rec-bean-sub">{bean.origin} · {ROAST_LEVELS.find(r=>r.id===bean.roast)?.label} · {bean.process}</div>
                  {bean.roasterId&&<div style={{fontSize:11,color:"var(--navy)",fontFamily:"'Inter',sans-serif",marginTop:2}}>by {ROASTERS.find(r=>r.id===bean.roasterId)?.name||""}</div>}
                </div>
                <div className="match-badge"><div className="match-pct">{bean.score}%</div><div className="match-lbl">match</div></div>
              </div>
              <div className="rec-bean-families">{topFams.map(([fam,sc])=>{const def=NOTE_FAMILIES[fam]||{color:"#888",bg:"#f5f5f5",border:"#ddd"};return <span key={fam} className="npill" style={{background:def.bg,color:def.color,border:`1px solid ${def.border}`}}>{fam} {sc}/10</span>;})}</div>
              <div className="rec-bean-why">{bean.why}</div>
            </div>
          );
        })}
      </>
      )}
    </>
  );
}

// ─── ROASTERS VIEW ────────────────────────────────────────────────────────────
function RoastersView({ palateProfile, onSelectRoaster }) {
  const [query,setQuery]=useState(""), [sortBy,setSortBy]=useState("match");
  const rl={light:"Light",light_med:"Lt-Med",medium:"Medium",med_dark:"Med-Dk",dark:"Dark"};
  const roasters=useMemo(()=>{
    let list=ROASTERS.filter(r=>!query||
      r.name.toLowerCase().includes(query.toLowerCase())||
      r.city.toLowerCase().includes(query.toLowerCase())||
      r.country.toLowerCase().includes(query.toLowerCase())||
      (r.beans||[]).some(b=>b.origin.toLowerCase().includes(query.toLowerCase()))
    ).map(r=>{
      const m=matchRoaster(palateProfile,r);
      return {...r, score:m.best, avgScore:m.avg, bestBean:m.bestBean, allBeans:m.allBeans};
    });
    if(sortBy==="match") list.sort((a,b)=>b.score-a.score);
    else if(sortBy==="rating") list.sort((a,b)=>b.rating-a.rating);
    else list.sort((a,b)=>a.name.localeCompare(b.name));
    return list;
  },[query,sortBy,palateProfile]);
  const topMatch=roasters[0];
  return (
    <>
      <div className="section-hdr"><div className="section-title">Roaster Discovery</div><div className="section-sub">Search by city, country, or name — matched to your palate</div></div>
      <div className="search-wrap"><span className="search-icon">⌕</span><input className="roaster-search" placeholder="London, Oslo, Melbourne…" value={query} onChange={e=>setQuery(e.target.value)}/></div>
      <div className="filter-row" style={{marginBottom:14}}>{[["match","Best Match"],["rating","Top Rated"],["name","A–Z"]].map(([id,label])=><button key={id} className={`fchip ${sortBy===id?"active":""}`} onClick={()=>setSortBy(id)}>{label}</button>)}</div>
      {!query&&topMatch&&<div className="insight-banner" style={{marginBottom:12}}><div className="insight-title">Your top palate match: {topMatch.name}</div><div className="insight-body">{topMatch.score}% compatibility with your tasting profile. Based in {topMatch.city}, {topMatch.country}.</div></div>}
      {roasters.map(r=>(
        <div key={r.id} className="roaster-card" onClick={()=>onSelectRoaster(r)}>
          <div className="roaster-top">
            <div><div className="roaster-name">{r.name}</div><div className="roaster-loc">{r.neighbourhood} · {r.city}, {r.country}</div></div>
            <div className="roaster-right"><div className="roaster-rating">{r.rating} ★</div>{r.verified&&<span className="verified-badge">✓ Verified</span>}</div>
          </div>
          <div className="roaster-spec">{r.speciality}</div>
          <div className="roaster-styles">{r.styles.map(s=><span key={s} className="roaster-style">{rl[s]||s}</span>)}</div>
          {r.bestBean&&<div style={{background:"var(--surface2)",borderRadius:"var(--rsm)",padding:"8px 10px",marginTop:8,border:"1.5px solid var(--border)"}}>
            <div style={{fontSize:9,fontFamily:"'Inter',sans-serif",letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--ink3)",marginBottom:3}}>Best match for you</div>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:13,color:"var(--ink)",textShadow:"none",marginBottom:2}}>{r.bestBean.name}</div>
            <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Fraunces',serif",fontStyle:"italic"}}>{r.bestBean.origin} · {rl[r.bestBean.roast]||r.bestBean.roast} · {r.bestBean.process}</div>
          </div>}
          <div className="roaster-match-row">
            <span>Best bean match</span>
            <div className="match-track"><div className="match-fill" style={{width:`${r.score}%`}}/></div>
            <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:r.score>=75?"var(--sage)":"var(--ink3)"}}>{r.score}%</span>
          </div>
          <div style={{fontSize:10,color:"var(--ink3)",fontFamily:"'Fraunces',serif",fontStyle:"italic",marginTop:3}}>{r.allBeans?.length||0} coffees · avg match {r.avgScore}%</div>
        </div>
      ))}
      {roasters.length===0&&<div className="empty"><span className="empty-icon">🗺️</span><div className="empty-t">No roasters found</div><div className="empty-s">Try a different city, country, or name.</div></div>}
    </>
  );
}

// ─── PAYWALL GATE (inline blocker) ───────────────────────────────────────────
function PaywallGate({ feature, reason, onUpgrade }) {
  return (
    <div style={{textAlign:"center",padding:"52px 24px"}}>
      <div style={{fontSize:36,marginBottom:16}}>🔒</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:20,color:"var(--ink)",marginBottom:8,textShadow:"none"}}>{feature}</div>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"var(--ink3)",lineHeight:1.6,marginBottom:28,fontStyle:"italic",maxWidth:280,margin:"0 auto 28px"}}>{reason}</div>
      <button onClick={onUpgrade} style={{background:"var(--navy)",color:"#fff",border:"none",borderRadius:12,padding:"14px 32px",fontFamily:"'Fraunces',serif",fontSize:17,cursor:"pointer",textShadow:"none",boxShadow:"0 4px 16px rgba(26,47,94,0.3)"}}>
        Unlock with Pro
      </button>
      <div style={{fontFamily:"'Fraunces',serif",fontSize:11,color:"var(--ink3)",marginTop:12,fontStyle:"italic"}}>$4.99/month · $34.99/year</div>
    </div>
  );
}

// ─── PAYWALL MODAL ────────────────────────────────────────────────────────────
function PaywallModal({ onClose, onUpgrade }) {
  const FREE_FEATURES = [
    "Unlimited coffee logging",
    "Tasting notes & scoring",
    "Brew recipes",
    "Café directory (browse)",
    "Global public feed",
    "Basic stats",
  ];
  const PRO_FEATURES = [
    { icon:"🎯", label:"Palate Radar Chart", desc:"Visual map of your flavour fingerprint" },
    { icon:"☕", label:"Bean Recommendations", desc:"Coffees matched to your palate by AI" },
    { icon:"🗺️", label:"Roaster Matching", desc:"Find roasters that suit your taste" },
    { icon:"👥", label:"Friends Feed", desc:"Follow friends and share privately" },
    { icon:"📊", label:"Advanced Analytics", desc:"Dimension breakdown, trends, origin rankings" },
    { icon:"🏆", label:"Contribute to Rankings", desc:"Your scores count toward the global café list" },
    { icon:"📤", label:"Export Your Data", desc:"Download your full journal anytime" },
  ];
  return (
    <div className="overlay" onClick={ev=>ev.target===ev.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"96vh"}}>
        <div className="modal-handle"/>
        <div style={{padding:"20px 20px 0",borderBottom:"1.5px solid var(--border)",marginBottom:0}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:"var(--ink)",textShadow:"none",marginBottom:4}}>Million Coffees Pro</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:13,color:"var(--ink3)",fontStyle:"italic",paddingBottom:16}}>For the obsessively curious. Unlock the full picture.</div>
        </div>
        <div style={{padding:"0 20px 32px"}}>

          {/* Pricing toggle */}
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,margin:"20px 0"}}>
            <div style={{border:"2px solid var(--navy)",borderRadius:12,padding:"14px 16px",textAlign:"center",background:"var(--blue-light)"}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:"var(--navy)",textShadow:"none"}}>$4.99</div>
              <div style={{fontSize:11,color:"var(--navy)",fontFamily:"'Inter',sans-serif",letterSpacing:"0.5px",textTransform:"uppercase",marginTop:2}}>Per month</div>
            </div>
            <div style={{border:"2px solid var(--navy)",borderRadius:12,padding:"14px 16px",textAlign:"center",background:"var(--navy)",position:"relative"}}>
              <div style={{position:"absolute",top:-10,left:"50%",transform:"translateX(-50%)",background:"var(--rose)",color:"#fff",fontSize:9,letterSpacing:"1px",textTransform:"uppercase",padding:"3px 10px",borderRadius:20,fontFamily:"'Inter',sans-serif",whiteSpace:"nowrap"}}>Best value</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:22,color:"#fff",textShadow:"none"}}>$34.99</div>
              <div style={{fontSize:11,color:"rgba(255,255,255,0.7)",fontFamily:"'Inter',sans-serif",letterSpacing:"0.5px",textTransform:"uppercase",marginTop:2}}>Per year</div>
              <div style={{fontSize:10,color:"rgba(255,255,255,0.5)",fontFamily:"'Fraunces',serif",fontStyle:"italic",marginTop:2}}>~$2.92/mo · save 42%</div>
            </div>
          </div>

          {/* Pro features */}
          <div style={{marginBottom:20}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:10,letterSpacing:"2px",textTransform:"uppercase",color:"var(--ink3)",marginBottom:10}}>Pro includes</div>
            {PRO_FEATURES.map(f=>(
              <div key={f.label} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:12}}>
                <div style={{fontSize:20,flexShrink:0,width:28,textAlign:"center"}}>{f.icon}</div>
                <div>
                  <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,fontWeight:500,color:"var(--ink)",marginBottom:1}}>{f.label}</div>
                  <div style={{fontFamily:"'Fraunces',serif",fontSize:12,color:"var(--ink3)",fontStyle:"italic"}}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>

          {/* Free tier reminder */}
          <div style={{background:"var(--surface2)",border:"1.5px solid var(--border)",borderRadius:"var(--rsm)",padding:"12px 14px",marginBottom:20}}>
            <div style={{fontFamily:"'Inter',sans-serif",fontSize:10,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--ink3)",marginBottom:8}}>Always free</div>
            <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
              {FREE_FEATURES.map(f=>(
                <span key={f} style={{fontSize:11,fontFamily:"'Inter',sans-serif",color:"var(--ink2)",display:"flex",alignItems:"center",gap:4}}>
                  <span style={{color:"var(--sage)"}}>✓</span> {f}
                </span>
              ))}
            </div>
          </div>

          <button onClick={onUpgrade} style={{width:"100%",padding:"15px",background:"var(--navy)",color:"#fff",border:"none",borderRadius:"var(--r)",fontFamily:"'Fraunces',serif",fontSize:19,cursor:"pointer",textShadow:"none",boxShadow:"0 4px 16px rgba(26,47,94,0.3)",marginBottom:10}}>
            Start Pro — 7 days free
          </button>
          <button onClick={onClose} style={{width:"100%",padding:"11px",background:"none",border:"1.5px solid var(--border)",borderRadius:"var(--r)",fontFamily:"'Inter',sans-serif",fontSize:13,cursor:"pointer",color:"var(--ink3)"}}>
            Maybe later
          </button>
          <div style={{textAlign:"center",marginTop:12,fontFamily:"'Fraunces',serif",fontSize:11,color:"var(--ink3)",fontStyle:"italic"}}>Cancel anytime. No commitment.</div>
        </div>
      </div>
    </div>
  );
}

// ─── CAFÉ DETAIL ──────────────────────────────────────────────────────────────
function CafeDetail({ cafe, onBack, myEntries, isPro, onUpgrade }) {
  const myLogsHere = myEntries.filter(e=>e.cafeName&&e.cafeName.toLowerCase()===cafe.name.toLowerCase());
  const overall = cafeOverall(cafe.scores);
  const topFams = (cafe.topNotes||[]).map(n=>NOTE_TO_FAM[n]).filter(Boolean);

  return (
    <div className="det-wrap">
      <div className="det-hdr">
        <button className="back-btn" onClick={onBack}>← Cafés</button>
        <div style={{display:"flex",gap:6,marginBottom:10,flexWrap:"wrap"}}>
          <span className="badge" style={{background:"var(--surface2)",color:"var(--ink2)"}}>{cafe.city}, {cafe.country}</span>
          {cafe.verified&&<span className="verified-badge">✓ Verified</span>}
        </div>
        <div className="det-title">{cafe.name}</div>
        <div className="det-roaster">{cafe.neighbourhood}</div>
        <div style={{display:"flex",alignItems:"baseline",gap:8,marginTop:8}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:32,color:"var(--ink)",textShadow:"none"}}>{overall}</div>
          <div style={{fontFamily:"'DM Mono',monospace",fontSize:12,color:"var(--ink3)"}}>/10 · {cafe.logs.toLocaleString()} logs</div>
        </div>
      </div>
      <div className="det-body">

        {/* Score breakdown */}
        <div className="dsec"><div className="dsec-title">Community Scores</div>
          <div style={{background:"var(--surface)",borderRadius:"var(--r)",border:"1.5px solid var(--border)",padding:"14px 16px"}}>
            {RATING_DIMS.map(d=>(
              <div key={d.id} style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                <div style={{width:64,fontSize:11,color:DIM_COLORS[d.id],fontFamily:"'Inter',sans-serif",fontWeight:500,flexShrink:0}}>{d.label}</div>
                <div style={{flex:1,height:6,background:"var(--border)",borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",width:`${(cafe.scores[d.id]/10)*100}%`,background:DIM_COLORS[d.id],borderRadius:3,opacity:0.85}}/>
                </div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:16,color:DIM_COLORS[d.id],width:28,textAlign:"right",textShadow:"none"}}>{cafe.scores[d.id]}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Top notes */}
        <div className="dsec"><div className="dsec-title">Most Logged Notes</div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {(cafe.topNotes||[]).map(n=>{
              const fam=NOTE_TO_FAM[n]; const def=NOTE_FAMILIES[fam]||{color:"#888",bg:"#f5f5f5",border:"#ddd"};
              return <span key={n} className="npill" style={{background:def.bg,color:def.color,border:`1px solid ${def.border}`,fontSize:13,padding:"5px 12px"}}>{n}</span>;
            })}
          </div>
        </div>

        {/* My logs here */}
        {myLogsHere.length>0&&<div className="dsec"><div className="dsec-title">Your visits here ({myLogsHere.length})</div>
          {myLogsHere.map(e=>(
            <div key={e.id} style={{background:"var(--surface)",borderRadius:"var(--rsm)",border:"1.5px solid var(--border)",padding:"10px 12px",marginBottom:8,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
              <div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"var(--ink)",textShadow:"none"}}>{e.name||"Coffee"}</div>
                <div style={{fontFamily:"'Fraunces',serif",fontSize:11,color:"var(--ink3)",marginTop:2}}>{fmtDate(e.date)}</div>
              </div>
              {e.scores&&<div style={{fontFamily:"'Fraunces',serif",fontSize:18,color:"var(--ink)",textShadow:"none"}}>{computeOverall(e.scores).toFixed(1)}</div>}
            </div>
          ))}
        </div>}

        {/* Contribute CTA */}
        {!isPro&&<div style={{background:"var(--blue-light)",border:"1.5px solid #bcd0e8",borderRadius:"var(--r)",padding:"14px 16px",marginTop:8}}>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:15,color:"var(--navy)",marginBottom:4,textShadow:"none"}}>Help build the rankings</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:12,color:"var(--ink3)",fontStyle:"italic",marginBottom:12}}>Pro members' logs count toward the global café score. Upgrade to contribute.</div>
          <button onClick={onUpgrade} style={{background:"var(--navy)",color:"#fff",border:"none",borderRadius:8,padding:"9px 18px",fontFamily:"'Inter',sans-serif",fontSize:12,cursor:"pointer",letterSpacing:"0.5px"}}>Upgrade to Pro</button>
        </div>}
      </div>
    </div>
  );
}

// ─── CAFÉ DIRECTORY ───────────────────────────────────────────────────────────
function CafeDirectory({ isPro, currentUser, onUpgrade, selCafe, setSelCafe, myEntries }) {
  const [query,setQuery]=useState("");
  const [sortBy,setSortBy]=useState("score");

  if(selCafe) return <CafeDetail cafe={selCafe} onBack={()=>setSelCafe(null)} myEntries={myEntries} isPro={isPro} onUpgrade={onUpgrade}/>;

  const cafes = CAFE_DIRECTORY
    .filter(c=>!query||c.name.toLowerCase().includes(query.toLowerCase())||c.city.toLowerCase().includes(query.toLowerCase())||c.country.toLowerCase().includes(query.toLowerCase()))
    .map((c,i)=>({...c,rank:i+1,overall:cafeOverall(c.scores)}))
    .sort((a,b)=>sortBy==="score"?b.overall-a.overall:sortBy==="logs"?b.logs-a.logs:a.name.localeCompare(b.name));

  return (
    <>
      <div className="section-hdr">
        <div className="section-title">World's Best Cafés</div>
        <div className="section-sub">Ranked by community scores across Aroma, Flavour, Mouthfeel & Finish</div>
      </div>

      {/* Pro contribute banner */}
      {!isPro&&currentUser&&<div style={{background:"var(--navy)",borderRadius:"var(--r)",padding:"14px 16px",marginBottom:14,display:"flex",justifyContent:"space-between",alignItems:"center",gap:12}}>
        <div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:14,color:"#fff",textShadow:"none",marginBottom:2}}>Contribute to rankings</div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:11,color:"rgba(255,255,255,0.65)",fontStyle:"italic"}}>Pro members' café logs count toward the global score</div>
        </div>
        <button onClick={onUpgrade} style={{background:"var(--rose)",color:"#fff",border:"none",borderRadius:8,padding:"8px 14px",fontFamily:"'Inter',sans-serif",fontSize:11,cursor:"pointer",flexShrink:0,letterSpacing:"0.5px"}}>Go Pro</button>
      </div>}

      <div className="search-wrap">
        <span className="search-icon">⌕</span>
        <input className="roaster-search" placeholder="Search café, city, or country…" value={query} onChange={e=>setQuery(e.target.value)}/>
      </div>

      <div className="filter-row" style={{marginBottom:14}}>
        {[["score","Top Rated"],["logs","Most Logged"],["name","A–Z"]].map(([id,label])=>(
          <button key={id} className={`fchip ${sortBy===id?"active":""}`} onClick={()=>setSortBy(id)}>{label}</button>
        ))}
      </div>

      {cafes.map((cafe,i)=>{
        const overall=cafe.overall;
        return (
          <div key={cafe.id} onClick={()=>setSelCafe(cafe)}
            style={{background:"var(--surface)",borderRadius:"var(--r)",border:"1.5px solid var(--border)",padding:"14px 16px",marginBottom:10,cursor:"pointer",display:"flex",gap:14,alignItems:"flex-start",transition:"all 0.15s"}}>
            {/* Rank */}
            <div style={{flexShrink:0,width:36,textAlign:"center",paddingTop:2}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:i<3?22:16,color:i===0?"#d4960a":i===1?"#7a8a9a":i===2?"#a07850":"var(--ink3)",lineHeight:1,textShadow:i<3?"1px 1px 0 #6b5a40":"none"}}>
                {i===0?"🥇":i===1?"🥈":i===2?"🥉":`#${i+1}`}
              </div>
            </div>
            {/* Info */}
            <div style={{flex:1,minWidth:0}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:16,color:"var(--ink)",marginBottom:2,textShadow:"none"}}>{cafe.name}</div>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:12,color:"var(--ink3)",marginBottom:7}}>{cafe.neighbourhood} · {cafe.city}, {cafe.country}</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:4}}>
                {(cafe.topNotes||[]).slice(0,3).map(n=>{
                  const fam=NOTE_TO_FAM[n]; const def=NOTE_FAMILIES[fam]||{color:"#888",bg:"#f5f5f5",border:"#ddd"};
                  return <span key={n} className="npill" style={{background:def.bg,color:def.color,border:`1px solid ${def.border}`,fontSize:10}}>{n}</span>;
                })}
              </div>
            </div>
            {/* Score */}
            <div style={{flexShrink:0,textAlign:"right"}}>
              <div style={{fontFamily:"'Fraunces',serif",fontSize:24,color:"var(--ink)",lineHeight:1,textShadow:"none"}}>{overall}</div>
              <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:"var(--ink3)",marginTop:2}}>{cafe.logs.toLocaleString()} logs</div>
              {cafe.verified&&<div style={{fontSize:9,color:"var(--sage)",fontFamily:"'Inter',sans-serif",marginTop:3}}>✓ verified</div>}
            </div>
          </div>
        );
      })}

      {cafes.length===0&&<div className="empty"><span className="empty-icon">🗺️</span><div className="empty-t">No cafés found</div><div className="empty-s">Try a different city or name.</div></div>}

      <div style={{textAlign:"center",padding:"24px 0 8px",fontFamily:"'Fraunces',serif",fontSize:12,color:"var(--ink3)",fontStyle:"italic",lineHeight:1.6}}>
        Rankings update as the community logs more coffees.<br/>
        <span style={{color:"var(--navy)"}}>Pro members' scores contribute to the global ranking.</span>
      </div>
    </>
  );
}

// ─── COMMUNITY FEED (Friends / Global) ────────────────────────────────────────
function FeedView({ currentUser, isPro, onUpgrade }) {
  const tab="global"; // friends feed disabled — global (opt-in public) only
  const [items,setItems]=useState([]);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true);
      let q=supabase.from("entries")
        .select("*, users(name, avatar_url)")
        .eq("is_public",true)
        .order("created_at",{ascending:false})
        .limit(60);
      const { data, error } = await q;
      if(error){ console.warn("Feed load:",error.message); if(!cancelled){setItems([]);setLoading(false);} return; }
      const mapped=(data||[])
        .filter(e=>!currentUser||e.user_id!==currentUser.id||tab==="global")
        .map(e=>({
          id:e.id, userId:e.user_id, name:e.coffee_name, roaster:e.roaster, origin:e.origin,
          scores:{aroma:e.score_aroma,flavour:e.score_flavour,mouthfeel:e.score_mouthfeel,finish:e.score_finish},
          notes:e.tasting_notes||[], comment:e.notes, photo:e.photo_url||null,
          author:e.share_as==="anon"?"A coffee lover":(e.users?.name||"A coffee lover"),
          avatar:e.share_as==="anon"?"·":((e.users?.name||"C")[0].toUpperCase()),
          created:e.created_at,
        }));
      if(!cancelled){ setItems(mapped); setLoading(false); }
    })();
    return ()=>{cancelled=true;};
  },[currentUser?.id]);

  const timeAgo=(ts)=>{
    if(!ts) return "";
    const d=(Date.now()-new Date(ts).getTime())/1000;
    if(d<3600) return Math.max(1,Math.round(d/60))+"m";
    if(d<86400) return Math.round(d/3600)+"h";
    return Math.round(d/86400)+"d";
  };

  return (
    <>
      <div className="rk-hdr">
        <div className="rk-eyebrow">Community</div>
        <div className="rk-title">The Feed</div>
      </div>


      <div style={{padding:"8px 0 40px"}}>
        {loading&&<div className="rk-empty">Loading…</div>}
        {!loading&&items.length===0&&(
          <div className="rk-empty-block">
            <div className="rk-empty-serif">Nothing shared yet</div>
            <div className="rk-empty-sub">Public logs from the community will appear here.</div>
          </div>
        )}
        {!loading&&items.map(item=>{
          const overall=computeOverall(item.scores);
          return (
            <div key={item.id} className="feed-card">
              <div className="feed-author">
                <div style={{display:"flex",alignItems:"center",gap:12,flex:1,minWidth:0}}>
                  <div className="feed-avatar">{item.avatar}</div>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="feed-name">{item.author}</div>
                    <div className="feed-time">{timeAgo(item.created)} ago</div>
                  </div>
                </div>
                {overall>0&&<div className="feed-score">{overall.toFixed(1)}</div>}
              </div>
              {item.photo&&<img src={item.photo} className="feed-photo" alt=""/>}
              {item.name&&<div className="feed-coffee">{item.name}</div>}
              {(item.roaster||item.origin)&&<div className="feed-meta">{[item.roaster,item.origin].filter(Boolean).join(" · ")}</div>}
              {item.comment&&<div className="feed-comment">"{item.comment}"</div>}
              {item.notes.length>0&&<div className="feed-notes">{item.notes.map(n=><span key={n} className="feed-note">{n}</span>)}</div>}
            </div>
          );
        })}
      </div>
    </>
  );
}

// ─── RANKINGS (Cafés / Roasters / Coffees, weighted, city-filterable) ─────────
function RankingsView({ currentUser }) {
  const [tab,setTab]=useState("coffees");
  const [rows,setRows]=useState([]);
  const [loading,setLoading]=useState(true);
  const [city,setCity]=useState("");
  const [cities,setCities]=useState([]);
  const [query,setQuery]=useState("");

  useEffect(()=>{
    supabase.from("ranking_cities").select("*").limit(50).then(({data})=>setCities(data||[]));
  },[]);

  useEffect(()=>{
    let cancelled=false;
    setLoading(true);
    const view=tab==="roasters"?"ranking_roasters":tab==="vibe"?"ranking_cafe_experience":"ranking_coffees";
    let q=supabase.from(view).select("*").limit(100);
    if(tab==="vibe"&&city) q=q.ilike("city",city);
    q.then(({data,error})=>{
      if(cancelled) return;
      if(error){ console.warn("Rankings:",error.message); setRows([]); }
      else setRows(data||[]);
      setLoading(false);
    });
    return ()=>{cancelled=true;};
  },[tab,city]);

  const medal=(i)=>String(i+1).padStart(2,"0");
  const q=query.trim().toLowerCase();
  const filtered=!q?rows:rows.filter(r=>{
    const hay=[r.name,r.city,r.location,r.roaster,r.origin].filter(Boolean).join(" ").toLowerCase();
    return hay.includes(q);
  });

  return (
    <>
      <div className="rk-hdr">
        <div className="rk-eyebrow">Community</div>
        <div className="rk-title">Rankings</div>
      </div>
      <div className="rk-toggle">
        {[["coffees","Coffees"],["roasters","Roasters"],["vibe","Cafés"]].map(([id,label])=>(
          <button key={id} className={`rk-tg ${tab===id?"on":""}`} onClick={()=>{setTab(id);if(id!=="vibe")setCity("");setQuery("");}}>{label}</button>
        ))}
      </div>

      <div className="rk-search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,color:"var(--ink3)"}}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input className="rk-search-in" placeholder={tab==="vibe"?"Search café or city…":tab==="roasters"?"Search roaster…":"Search coffee, roaster, origin…"} value={query} onChange={ev=>setQuery(ev.target.value)}/>
        {query&&<button className="rk-search-x" onClick={()=>setQuery("")}>✕</button>}
      </div>

      {tab==="vibe"&&cities.length>0&&(
        <div className="rk-cityrow">
          <button className={`rk-citychip ${!city?"on":""}`} onClick={()=>setCity("")}>All cities</button>
          {cities.slice(0,12).map(c=><button key={c.city} className={`rk-citychip ${city===c.city?"on":""}`} onClick={()=>setCity(c.city)}>{c.city}</button>)}
        </div>
      )}

      <div style={{padding:"4px 0 40px"}}>
        {loading&&<div className="rk-empty">Loading…</div>}
        {!loading&&rows.length===0&&(
          <div className="rk-empty-block">
            <div className="rk-empty-serif">No rankings yet</div>
            <div className="rk-empty-sub">As people log {tab==="vibe"?"café visits":tab==="roasters"?"roasters":"coffees"} publicly, the best rise here.</div>
          </div>
        )}
        {!loading&&rows.length>0&&filtered.length===0&&(
          <div className="rk-empty-block">
            <div className="rk-empty-serif">No matches for "{query}"</div>
            <div className="rk-empty-sub">Try a different name or city.</div>
          </div>
        )}
        {!loading&&filtered.map((r,i)=>(
          <div key={(r.name||"")+i} className="rank-row">
            <div className="rank-num">{medal(i)}</div>
            <div className="rank-body">
              <div className="rank-name">{r.name}</div>
              <div className="rank-sub">
                                {tab==="roasters"&&`${r.coffees} ${r.coffees===1?"coffee":"coffees"} · ${r.logs} ${r.logs===1?"log":"logs"}`}
                {tab==="coffees"&&[r.roaster,r.origin].filter(Boolean).join(" · ")}
                {tab==="vibe"&&[r.city,`${r.ratings} ${r.ratings===1?"rating":"ratings"}`].filter(Boolean).join(" · ")}
              </div>
            </div>
            <div className="rank-score">{Number(r.weighted_score!=null?r.weighted_score:r.weighted_rating).toFixed(1)}</div>
          </div>
        ))}
        {!loading&&filtered.length>0&&(
          <div className="rk-foot">Ranked by a weighted score that balances rating with how many people logged it.</div>
        )}
      </div>
    </>
  );
}

// ─── PEOPLE (find & follow) ───────────────────────────────────────────────────
function PeopleView({ currentUser, onOpenProfile }) {
  const [query,setQuery]=useState("");
  const [results,setResults]=useState([]);
  const [suggested,setSuggested]=useState([]);
  const [followingIds,setFollowingIds]=useState([]);
  const [loading,setLoading]=useState(false);

  // load who I follow + a few suggested (most active) users
  useEffect(()=>{
    if(!currentUser?.id) return;
    supabase.from("follows").select("following_id").eq("follower_id",currentUser.id)
      .then(({data})=>setFollowingIds((data||[]).map(x=>x.following_id)));
    supabase.from("user_follow_counts").select("*").order("public_logs",{ascending:false}).limit(12)
      .then(({data})=>setSuggested((data||[]).filter(u=>u.user_id!==currentUser.id)));
  },[currentUser?.id]);

  useEffect(()=>{
    const q=query.trim();
    if(q.length<2){ setResults([]); return; }
    setLoading(true);
    const t=setTimeout(()=>{
      supabase.from("user_follow_counts").select("*").ilike("name",`%${q}%`).limit(20)
        .then(({data})=>{ setResults((data||[]).filter(u=>u.user_id!==currentUser?.id)); setLoading(false); });
    },250);
    return ()=>clearTimeout(t);
  },[query,currentUser?.id]);

  const toggleFollow=async(uid)=>{
    if(!currentUser?.id) return;
    if(followingIds.includes(uid)){
      setFollowingIds(followingIds.filter(x=>x!==uid));
      await supabase.from("follows").delete().eq("follower_id",currentUser.id).eq("following_id",uid);
    } else {
      setFollowingIds([...followingIds,uid]);
      await supabase.from("follows").insert({follower_id:currentUser.id,following_id:uid});
    }
  };

  const list=query.trim().length>=2?results:suggested;

  return (
    <>
      <div className="rk-hdr">
        <div className="rk-eyebrow">Community</div>
        <div className="rk-title">People</div>
      </div>
      <div className="rk-search" style={{marginTop:18}}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" style={{flexShrink:0,color:"var(--ink3)"}}><circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="1.5"/><path d="M21 21l-4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
        <input className="rk-search-in" placeholder="Search people by name…" value={query} onChange={ev=>setQuery(ev.target.value)}/>
        {query&&<button className="rk-search-x" onClick={()=>setQuery("")}>✕</button>}
      </div>

      <div style={{padding:"4px 0 40px"}}>
        {query.trim().length<2&&<div className="rk-eyebrow" style={{padding:"22px 0 4px"}}>Suggested</div>}
        {loading&&<div className="rk-empty">Searching…</div>}
        {!loading&&list.length===0&&query.trim().length>=2&&(
          <div className="rk-empty-block"><div className="rk-empty-serif">No one found</div><div className="rk-empty-sub">Try a different name.</div></div>
        )}
        {!loading&&list.length===0&&query.trim().length<2&&(
          <div className="rk-empty-block"><div className="rk-empty-serif">No one to suggest yet</div><div className="rk-empty-sub">As more people join and log coffees, they'll show up here.</div></div>
        )}
        {list.map(u=>(
          <div key={u.user_id} className="person-row">
            <button className="person-main" onClick={()=>onOpenProfile(u.user_id)}>
              <div className="feed-avatar">{(u.name||"?")[0].toUpperCase()}</div>
              <div style={{flex:1,minWidth:0}}>
                <div className="person-name">{u.name||"Coffee drinker"}</div>
                <div className="person-sub">{u.public_logs} {u.public_logs===1?"log":"logs"} · {u.followers} {u.followers===1?"follower":"followers"}</div>
              </div>
            </button>
            <button className={`follow-btn ${followingIds.includes(u.user_id)?"following":""}`} onClick={()=>toggleFollow(u.user_id)}>
              {followingIds.includes(u.user_id)?"Following":"Follow"}
            </button>
          </div>
        ))}
      </div>
    </>
  );
}

// ─── USER PROFILE ─────────────────────────────────────────────────────────────
function UserProfile({ userId, currentUser, onBack, onOpenEntry }) {
  const [profile,setProfile]=useState(null);
  const [entries,setEntries]=useState([]);
  const [isFollowing,setIsFollowing]=useState(false);
  const [loading,setLoading]=useState(true);

  useEffect(()=>{
    let cancelled=false;
    (async()=>{
      setLoading(true);
      const { data:p } = await supabase.from("user_follow_counts").select("*").eq("user_id",userId).single();
      const { data:es } = await supabase.from("entries").select("*").eq("user_id",userId).eq("is_public",true).order("created_at",{ascending:false}).limit(50);
      if(currentUser?.id){
        const { data:f } = await supabase.from("follows").select("id").eq("follower_id",currentUser.id).eq("following_id",userId).maybeSingle();
        if(!cancelled) setIsFollowing(!!f);
      }
      if(!cancelled){ setProfile(p); setEntries(es||[]); setLoading(false); }
    })();
    return ()=>{cancelled=true;};
  },[userId,currentUser?.id]);

  const toggleFollow=async()=>{
    if(!currentUser?.id) return;
    if(isFollowing){
      setIsFollowing(false);
      setProfile(p=>p?{...p,followers:Math.max(0,p.followers-1)}:p);
      await supabase.from("follows").delete().eq("follower_id",currentUser.id).eq("following_id",userId);
    } else {
      setIsFollowing(true);
      setProfile(p=>p?{...p,followers:p.followers+1}:p);
      await supabase.from("follows").insert({follower_id:currentUser.id,following_id:userId});
    }
  };

  const isMe=currentUser?.id===userId;

  return (
    <div className="app">
      <div style={{padding:"20px 26px 0"}}>
        <button className="lf-x" onClick={onBack}><svg width="22" height="22" viewBox="0 0 24 24" fill="none"><path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></button>
      </div>
      {loading&&<div className="rk-empty">Loading…</div>}
      {!loading&&profile&&<>
        <div style={{padding:"16px 26px 0",display:"flex",alignItems:"center",gap:16}}>
          <div className="feed-avatar" style={{width:64,height:64,fontSize:24}}>{(profile.name||"?")[0].toUpperCase()}</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"var(--serif)",fontSize:26,fontWeight:300,color:"var(--ink)",lineHeight:1.1}}>{profile.name||"Coffee drinker"}</div>
          </div>
        </div>
        <div style={{display:"flex",gap:28,padding:"20px 26px 0"}}>
          <div><span className="prof-num">{profile.public_logs}</span> <span className="prof-lbl">logs</span></div>
          <div><span className="prof-num">{profile.followers}</span> <span className="prof-lbl">followers</span></div>
          <div><span className="prof-num">{profile.following}</span> <span className="prof-lbl">following</span></div>
        </div>
        {!isMe&&currentUser&&<div style={{padding:"20px 26px 0"}}>
          <button className={`follow-btn-lg ${isFollowing?"following":""}`} onClick={toggleFollow}>{isFollowing?"Following":"Follow"}</button>
        </div>}

        <div className="rk-eyebrow" style={{padding:"30px 26px 4px"}}>Recent public logs</div>
        <div style={{padding:"0 26px 40px"}}>
          {entries.length===0&&<div className="rk-empty-block"><div className="rk-empty-serif">No public logs yet</div></div>}
          {entries.map(e=>{
            const sc=computeOverall({aroma:e.score_aroma,flavour:e.score_flavour,mouthfeel:e.score_mouthfeel,finish:e.score_finish});
            return (
              <div key={e.id} className="feed-card">
                <div style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",gap:12}}>
                  <div style={{flex:1,minWidth:0}}>
                    <div className="feed-coffee">{e.coffee_name||"Untitled"}</div>
                    {(e.roaster||e.origin)&&<div className="feed-meta">{[e.roaster,e.origin].filter(Boolean).join(" · ")}</div>}
                  </div>
                  {sc>0&&<div className="feed-score">{sc.toFixed(1)}</div>}
                </div>
                {e.notes&&<div className="feed-comment">"{e.notes}"</div>}
                {e.tasting_notes&&e.tasting_notes.length>0&&<div className="feed-notes">{e.tasting_notes.map(n=><span key={n} className="feed-note">{n}</span>)}</div>}
              </div>
            );
          })}
        </div>
      </>}
    </div>
  );
}

// ─── DIAGNOSTIC PANEL ─────────────────────────────────────────────────────────
// A built-in smoke test that runs core operations against Supabase and reports
// pass/fail for each. Access via the avatar long-press or the ?debug URL param.
function DiagnosticPanel({ currentUser, onClose }) {
  const [tests,setTests]=useState([]);
  const [running,setRunning]=useState(false);
  const [done,setDone]=useState(false);

  const log=(name,status,detail="")=>setTests(prev=>[...prev,{name,status,detail}]);

  const runDiagnostics=async()=>{
    setTests([]); setRunning(true); setDone(false);
    let testEntryId=null;

    // 1. Supabase client configured
    try {
      const url=SUPABASE_URL;
      if(!url||url==="YOUR_SUPABASE_URL"){ log("Supabase URL configured","fail","Still set to placeholder — check .env"); }
      else if(url.includes("/rest/v1")){ log("Supabase URL configured","fail","URL has /rest/v1 — remove it"); }
      else if(!url.startsWith("https://")){ log("Supabase URL configured","fail","URL must start with https://"); }
      else log("Supabase URL configured","pass",url.replace("https://","").split(".")[0]+"…");
    } catch(e){ log("Supabase URL configured","fail",e.message); }

    // 2. Auth session
    try {
      const { data:{ session } } = await supabase.auth.getSession();
      if(session?.user) log("Auth session active","pass",session.user.email);
      else log("Auth session active","warn","No session — signed out or guest");
    } catch(e){ log("Auth session active","fail",e.message); }

    // 3. Read users table (RLS check)
    if(currentUser?.id){
      try {
        const { data, error } = await supabase.from("users").select("id,is_pro").eq("id",currentUser.id).single();
        if(error) log("Read own profile (RLS)","fail",error.message);
        else log("Read own profile (RLS)","pass",`is_pro=${data.is_pro}`);
      } catch(e){ log("Read own profile (RLS)","fail",e.message); }
    } else { log("Read own profile (RLS)","warn","Skipped — no user"); }

    // 4. Read entries
    if(currentUser?.id){
      try {
        const { data, error } = await supabase.from("entries").select("id").eq("user_id",currentUser.id).limit(5);
        if(error) log("Read entries","fail",error.message);
        else log("Read entries","pass",`${data.length} found`);
      } catch(e){ log("Read entries","fail",e.message); }
    } else { log("Read entries","warn","Skipped — no user"); }

    // 5. Insert a test entry
    if(currentUser?.id){
      try {
        const { data, error } = await supabase.from("entries").insert({
          user_id:currentUser.id, type:"home", drink_type:"espresso",
          coffee_name:"__DIAGNOSTIC_TEST__", date:new Date().toISOString().split("T")[0],
          score_aroma:8, score_flavour:8, score_mouthfeel:7, score_finish:8,
          tasting_notes:["test"], is_public:false,
        }).select().single();
        if(error){ log("Insert test entry","fail",error.message); }
        else { testEntryId=data.id; log("Insert test entry","pass","UUID "+data.id.slice(0,8)+"…"); }
      } catch(e){ log("Insert test entry","fail",e.message); }
    } else { log("Insert test entry","warn","Skipped — no user"); }

    // 6. Read it back
    if(testEntryId){
      try {
        const { data, error } = await supabase.from("entries").select("*").eq("id",testEntryId).single();
        if(error) log("Read back test entry","fail",error.message);
        else log("Read back test entry","pass","Composite "+((data.score_aroma*0.25+data.score_flavour*0.35+data.score_mouthfeel*0.15+data.score_finish*0.25).toFixed(1)));
      } catch(e){ log("Read back test entry","fail",e.message); }
    }

    // 7. Storage bucket exists
    if(currentUser?.id){
      try {
        const { error } = await supabase.storage.from("entry-photos").list(currentUser.id,{ limit:1 });
        if(error){
          if(error.message.includes("not found")||error.message.includes("Bucket")) log("Storage bucket 'entry-photos'","fail","Bucket missing — create it in Storage tab");
          else log("Storage bucket 'entry-photos'","warn",error.message);
        }
        else log("Storage bucket 'entry-photos'","pass","Accessible");
      } catch(e){ log("Storage bucket 'entry-photos'","fail",e.message); }
    } else { log("Storage bucket 'entry-photos'","warn","Skipped — no user"); }

    // 8. Clean up test entry
    if(testEntryId){
      try {
        const { error } = await supabase.from("entries").delete().eq("id",testEntryId);
        if(error) log("Delete test entry (cleanup)","fail",error.message);
        else log("Delete test entry (cleanup)","pass","Removed");
      } catch(e){ log("Delete test entry (cleanup)","fail",e.message); }
    }

    // 9. Public feed read
    try {
      const { data, error } = await supabase.from("entries").select("id").eq("is_public",true).limit(5);
      if(error) log("Read public feed","fail",error.message);
      else log("Read public feed","pass",`${data.length} public entries`);
    } catch(e){ log("Read public feed","fail",e.message); }

    setRunning(false); setDone(true);
  };

  return (
    <div className="overlay" onClick={ev=>ev.target===ev.currentTarget&&onClose()}>
      <div className="modal" style={{maxHeight:"90vh"}}>
        <div className="modal-handle"/>
        <div style={{padding:"4px 20px 20px"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
            <div style={{fontFamily:"'Fraunces',serif",fontSize:20,color:"var(--ink)",textShadow:"none"}}>Diagnostics</div>
            <button onClick={onClose} style={{background:"none",border:"none",fontSize:22,color:"var(--ink3)",cursor:"pointer"}}>×</button>
          </div>
          <div style={{fontFamily:"'Fraunces',serif",fontSize:12,color:"var(--ink3)",fontStyle:"italic",marginBottom:16}}>Runs core operations against your Supabase backend and reports what works.</div>

          <button onClick={runDiagnostics} disabled={running} style={{width:"100%",padding:"13px",background:"var(--navy)",color:"#fff",border:"none",borderRadius:"var(--r)",fontFamily:"'Fraunces',serif",fontSize:16,cursor:running?"wait":"pointer",textShadow:"none",marginBottom:16,opacity:running?0.7:1}}>
            {running?"Running tests…":done?"Run again":"Run diagnostics"}
          </button>

          {tests.map((t,i)=>(
            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:10,padding:"9px 0",borderBottom:i<tests.length-1?"1px solid var(--border)":"none"}}>
              <div style={{fontSize:16,flexShrink:0,width:20,textAlign:"center"}}>{t.status==="pass"?"✅":t.status==="fail"?"❌":"⚠️"}</div>
              <div style={{flex:1}}>
                <div style={{fontFamily:"'Inter',sans-serif",fontSize:13,color:"var(--ink)",fontWeight:500}}>{t.name}</div>
                {t.detail&&<div style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:t.status==="fail"?"#a03030":"var(--ink3)",marginTop:2,wordBreak:"break-word"}}>{t.detail}</div>}
              </div>
            </div>
          ))}

          {done&&<div style={{marginTop:16,padding:"12px 14px",background:tests.some(t=>t.status==="fail")?"#fef0f0":"var(--sage-light)",border:`1.5px solid ${tests.some(t=>t.status==="fail")?"#f0c0c0":"#a8c8a8"}`,borderRadius:"var(--rsm)",fontFamily:"'Fraunces',serif",fontSize:12,color:tests.some(t=>t.status==="fail")?"#8b2020":"var(--sage)"}}>
            {tests.some(t=>t.status==="fail")
              ? `${tests.filter(t=>t.status==="fail").length} test(s) failed — see details above.`
              : `All critical tests passed. ${tests.filter(t=>t.status==="pass").length} green.`}
          </div>}
        </div>
      </div>
    </div>
  );
}

// ─── LOGIN ─────────────────────────────────────────────────────────────────────
function Login({ onLogin, onSkip }) {
  const [mode,setMode]=useState("login");
  const [name,setName]=useState("");
  const [email,setEmail]=useState("");
  const [pass,setPass]=useState("");
  const [loading,setLoading]=useState(false);
  const [error,setError]=useState("");

  const handleAuth = async () => {
    if(!email||!pass){ setError("Please enter your email and password."); return; }
    setLoading(true); setError("");
    try {
      if(mode==="signup"){
        const { data, error:e } = await supabase.auth.signUp({
          email, password:pass,
          options:{ data:{ name: name||email.split("@")[0] } }
        });
        if(e) throw e;
        if(data.user) onLogin({ id:data.user.id, name:name||email.split("@")[0], email, avatar:(name||email||"C")[0].toUpperCase() });
      } else {
        const { data, error:e } = await supabase.auth.signInWithPassword({ email, password:pass });
        if(e) throw e;
        const profile = await supabase.from("users").select("*").eq("id",data.user.id).single();
        onLogin({
          id: data.user.id,
          name: profile.data?.name || email.split("@")[0],
          email,
          avatar: (profile.data?.name||email||"C")[0].toUpperCase(),
          is_pro: profile.data?.is_pro || false,
        });
      }
    } catch(e) {
      setError(e.message||"Something went wrong. Please try again.");
    } finally { setLoading(false); }
  };

  const handleGoogle = async () => {
    await supabase.auth.signInWithOAuth({ provider:"google", options:{ redirectTo: window.location.origin } });
  };

  return (
    <div className="login-wrap">
      <div style={{marginBottom:8,textAlign:"center"}}><TileWordmark size="lg"/></div>
      <div style={{height:20}}/>
      <div className="login-sub">A journal for the obsessively curious</div>
      <div className="login-card">
        <div className="login-tabs">
          <button className={`login-tab ${mode==="login"?"active":""}`} onClick={()=>{setMode("login");setError("");}}>Sign In</button>
          <button className={`login-tab ${mode==="signup"?"active":""}`} onClick={()=>{setMode("signup");setError("");}}>Create Account</button>
        </div>
        {mode==="signup"&&<div style={{marginBottom:20}}>
          <label style={{fontSize:11,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--ink3)",display:"block",marginBottom:5,fontFamily:"'Inter',sans-serif",fontWeight:500}}>Name</label>
          <input className="finput" placeholder="Your name" value={name} onChange={e=>setName(e.target.value)}/>
        </div>}
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--ink3)",display:"block",marginBottom:5,fontFamily:"'Inter',sans-serif",fontWeight:500}}>Email</label>
          <input className="finput" type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={ev=>ev.key==="Enter"&&handleAuth()}/>
        </div>
        <div style={{marginBottom:20}}>
          <label style={{fontSize:11,letterSpacing:"1.5px",textTransform:"uppercase",color:"var(--ink3)",display:"block",marginBottom:5,fontFamily:"'Inter',sans-serif",fontWeight:500}}>Password</label>
          <input className="finput" type="password" placeholder="••••••••" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={ev=>ev.key==="Enter"&&handleAuth()}/>
        </div>
        {error&&<div style={{background:"#fef0f0",border:"1.5px solid #f0c0c0",borderRadius:"var(--rsm)",padding:"8px 12px",marginBottom:10,fontSize:12,color:"#8b2020",fontFamily:"'Fraunces',serif"}}>{error}</div>}
        <button className="login-btn" onClick={handleAuth} style={{opacity:loading?0.7:1}}>
          {loading?"…":(mode==="signup"?"Create Account":"Sign In")}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"14px 0",opacity:0.4}}>
          <div style={{flex:1,height:1,background:"var(--border)"}}/>
          <span style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Inter',sans-serif"}}>or</span>
          <div style={{flex:1,height:1,background:"var(--border)"}}/>
        </div>
        <button onClick={handleGoogle} style={{width:"100%",padding:"11px",background:"var(--surface)",border:"1.5px solid var(--border)",borderRadius:"var(--rsm)",fontFamily:"'Inter',sans-serif",fontSize:13,cursor:"pointer",color:"var(--ink2)",display:"flex",alignItems:"center",justifyContent:"center",gap:8}}>
          <svg width="16" height="16" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
          Continue with Google
        </button>
        <div className="login-note">Your journal is private by default. You choose what to share.</div>
      </div>
      <div style={{marginTop:20,textAlign:"center"}}>
        <button className="login-skip" onClick={onSkip}>Browse without an account →</button>
        <div style={{fontSize:11,color:"var(--ink3)",fontFamily:"'Fraunces',serif",fontStyle:"italic",marginTop:8,lineHeight:1.5}}>You can always sign up later.<br/>Your data stays private by default.</div>
      </div>
    </div>
  );
}

// ─── MAIN ──────────────────────────────────────────────────────────────────────
export default function MillionCoffees() {
  const [screen,setScreen]=useState("loading");
  const [currentUser,setCurrentUser]=useState(null);
  const [isPro,setIsPro]=useState(false);
  const [showPaywall,setShowPaywall]=useState(false);
  const [showDiag,setShowDiag]=useState(()=>typeof window!=="undefined"&&window.location.search.includes("debug"));
  const [selCafe,setSelCafe]=useState(null);
  const [tab,setTab]=useState("journal");
  const [entries,setEntries]=useState(SAMPLE_ENTRIES);
  const [loadingEntries,setLoadingEntries]=useState(false);
  const [filter,setFilter]=useState("all");
  const [showForm,setShowForm]=useState(false);
  const [selEntry,setSelEntry]=useState(null);
  const [selRecipe,setSelRecipe]=useState(null);
  const [selRoaster,setSelRoaster]=useState(null);
  const [editEntry,setEditEntry]=useState(null);

  // ── Check for existing session on mount ──────────────────────────────
  useEffect(()=>{
    if(!SUPABASE_CONFIGURED){ setScreen("login"); return; }
    supabase.auth.getSession().then(({ data:{ session } })=>{
      if(session?.user){
        supabase.from("users").select("*").eq("id",session.user.id).single().then(({ data })=>{
          setCurrentUser({
            id: session.user.id,
            name: data?.name || session.user.email.split("@")[0],
            email: session.user.email,
            avatar: (data?.name||session.user.email||"C")[0].toUpperCase(),
            is_pro: data?.is_pro||false,
          });
          setIsPro(data?.is_pro||false);
          setScreen("app");
        });
      } else {
        setScreen("login");
      }
    });

    // Listen for auth changes (e.g. Google OAuth redirect)
    const { data:{ subscription } } = supabase.auth.onAuthStateChange((_event, session)=>{
      if(session?.user && screen==="login"){
        supabase.from("users").select("*").eq("id",session.user.id).single().then(({ data })=>{
          setCurrentUser({
            id: session.user.id,
            name: data?.name || session.user.email.split("@")[0],
            email: session.user.email,
            avatar: (data?.name||session.user.email||"C")[0].toUpperCase(),
            is_pro: data?.is_pro||false,
          });
          setIsPro(data?.is_pro||false);
          setScreen("app");
        });
      }
    });
    return ()=>subscription.unsubscribe();
  },[]);

  // ── Load entries from Supabase when user logs in ──────────────────────
  const loadEntries = useCallback(async (userId)=>{
    if(!userId){ setEntries(SAMPLE_ENTRIES); return; }
    setLoadingEntries(true);
    try {
      const { data, error } = await supabase
        .from("entries")
        .select("*, entry_photos(storage_url, sort_order)")
        .eq("user_id", userId)
        .order("date", { ascending:false });
      if(error) throw error;
      // Map DB fields to app fields
      const mapped = (data||[]).map(e=>({
        id: e.id,
        userId: "me",
        type: e.type,
        drinkType: e.drink_type,
        customDrinkType: e.custom_drink_type,
        name: e.coffee_name,
        roaster: e.roaster,
        origin: e.origin,
        process: e.process,
        roastLevel: e.roast_level,
        beanFreshness: e.bean_freshness,
        method: e.method,
        machine: e.machine,
        grinder: e.grinder,
        grindSetting: e.grind_setting,
        water: e.water_type,
        waterTemp: e.water_temp,
        coffeeGrams: e.coffee_grams,
        yieldGrams: e.yield_grams,
        extractionTime: e.extraction_time,
        scores: { aroma:e.score_aroma, flavour:e.score_flavour, mouthfeel:e.score_mouthfeel, finish:e.score_finish },
        tastingNotes: e.tasting_notes||[],
        notes: e.notes,
        cafeName: e.cafe_name,
        cafeLocation: e.cafe_location,
        cafePlaceId: e.cafe_place_id,
        cafeCity: e.cafe_city,
        cafeRating: e.cafe_rating,
        cafeTags: e.cafe_tags||[],
        date: e.date,
        isPublic: e.is_public,
        isDecaf: e.is_decaf,
        hasMilk: e.has_milk,
        photo: e.entry_photos?.[0]?.storage_url||null,
      }));
      setEntries(mapped);  // real user sees their own entries (even if empty)
    } catch(err) {
      console.error("Failed to load entries:", err);
      setEntries(SAMPLE_ENTRIES);
    } finally { setLoadingEntries(false); }
  }, []);

  useEffect(()=>{ if(currentUser?.id) loadEntries(currentUser.id); },[currentUser?.id]);

  // ── Load public feed (other users' shared entries) ────────────────────
  const [publicFeed,setPublicFeed]=useState([]);
  useEffect(()=>{
    if(screen!=="app") return;
    supabase.from("entries")
      .select("*, users(name, avatar_url)")
      .eq("is_public", true)
      .order("created_at",{ ascending:false })
      .limit(50)
      .then(({ data, error })=>{
        if(error){ console.warn("Public feed load failed:",error.message); return; }
        const mapped=(data||[])
          .filter(e=>!currentUser||e.user_id!==currentUser.id)
          .map(e=>({
            id:e.id, userId:e.user_id, type:e.type, drinkType:e.drink_type,
            name:e.coffee_name, roaster:e.roaster, origin:e.origin,
            roastLevel:e.roast_level, method:e.method,
            scores:{aroma:e.score_aroma,flavour:e.score_flavour,mouthfeel:e.score_mouthfeel,finish:e.score_finish},
            tastingNotes:e.tasting_notes||[], notes:e.notes,
            cafeName:e.cafe_name, cafeLocation:e.cafe_location, date:e.date,
            isPublic:true, authorName:e.users?.name, authorAvatar:e.users?.avatar_url,
          }));
        setPublicFeed(mapped);
      });
  },[screen,currentUser?.id,entries.length]);

  // ── Save entry to Supabase ────────────────────────────────────────────
  const saveEntry = async (entry) => {
    // Optimistic UI update — replace if editing existing, else prepend
    setEntries(prev=>{
      const exists = prev.some(e=>e.id===entry.id);
      if(exists) return prev.map(e=>e.id===entry.id?{...entry,userId:e.userId||"me"}:e);
      return [{...entry,userId:"me"}, ...prev];
    });

    if(!currentUser?.id) return; // guest — keep in memory only

    try {
      // Upload photo to storage if present as base64
      let photoUrl = null;
      if(entry.photo && entry.photo.startsWith("data:")){
        const bytes = atob(entry.photo.split(",")[1]);
        const arr = new Uint8Array(bytes.length);
        for(let i=0;i<bytes.length;i++) arr[i]=bytes.charCodeAt(i);
        const blob = new Blob([arr], { type:"image/jpeg" });
        const path = `${currentUser.id}/${Date.now()}.jpg`;
        const { error:uploadErr } = await supabase.storage.from("entry-photos").upload(path, blob, { upsert:true });
        if(!uploadErr){
          const { data:{ publicUrl } } = supabase.storage.from("entry-photos").getPublicUrl(path);
          photoUrl = publicUrl;
        }
      } else {
        photoUrl = entry.photo;
      }

      // Clean helper — empty/zero values become null, text fields trimmed
      const numOrNull = v => (v===""||v===undefined||v===null||Number.isNaN(v)) ? null : Number(v);
      const txtOrNull = v => (v===""||v===undefined) ? null : v;

      // If editing an existing DB row (real UUID), update it; otherwise insert new.
      const isEdit = typeof entry.id==="string" && entry.id.includes("-");
      const payload = {
        user_id: currentUser.id,
        type: entry.type||"home",
        drink_type: txtOrNull(entry.drinkType),
        custom_drink_type: txtOrNull(entry.customDrinkType),
        coffee_name: txtOrNull(entry.name),
        roaster: txtOrNull(entry.roaster),
        origin: txtOrNull(entry.origin||entry.customOrigin),
        process: txtOrNull(entry.process),
        roast_level: txtOrNull(entry.roastLevel),
        bean_freshness: txtOrNull(entry.beanFreshness),
        method: txtOrNull(entry.method),
        machine: txtOrNull(entry.machine),
        grinder: txtOrNull(entry.grinder),
        grind_setting: txtOrNull(entry.grindSetting),
        water_type: txtOrNull(entry.water),
        water_temp: numOrNull(entry.waterTemp),
        coffee_grams: numOrNull(entry.coffeeGrams),
        yield_grams: numOrNull(entry.yieldGrams),
        extraction_time: txtOrNull(entry.extractionTime),
        score_aroma: numOrNull(entry.scores?.aroma),
        score_flavour: numOrNull(entry.scores?.flavour),
        score_mouthfeel: numOrNull(entry.scores?.mouthfeel),
        score_finish: numOrNull(entry.scores?.finish),
        tasting_notes: entry.tastingNotes||[],
        notes: txtOrNull(entry.notes),
        cafe_name: txtOrNull(entry.cafeName),
        cafe_location: txtOrNull(entry.cafeLocation || entry.cafeAddress),
        cafe_city: txtOrNull(entry.cafeCity),
        cafe_place_id: txtOrNull(entry.cafePlaceId),
        cafe_rating: numOrNull(entry.cafeRating),
        cafe_tags: entry.cafeTags||[],
        date: entry.date,
        is_public: !!entry.isPublic,
        share_as: entry.shareAs||"name",
        is_decaf: !!entry.isDecaf,
        has_milk: !!entry.hasMilk,
      };
      const resp = isEdit
        ? await supabase.from("entries").update(payload).eq("id",entry.id).select().single()
        : await supabase.from("entries").insert(payload).select().single();
      const savedEntry = resp.data; const entryErr = resp.error;
      if(entryErr){ console.error("Entry save error:", entryErr); alert("Couldn't save: "+entryErr.message); throw entryErr; }
      // Replace optimistic entry with the real saved one (real UUID)
      if(savedEntry){
        setEntries(prev=>prev.map(e=>e.id===entry.id?{...e,id:savedEntry.id}:e));
      }

      // Save photo record
      if(photoUrl && savedEntry){
        await supabase.from("entry_photos").insert({
          entry_id: savedEntry.id,
          storage_url: photoUrl,
          sort_order: 0,
        });
      }

      // Save equipment to user_equipment table
      for(const [type, name] of [["machine",entry.machine],["grinder",entry.grinder],["roaster",entry.roaster]]){
        if(!name) continue;
        try {
          await supabase.from("user_equipment").upsert({
            user_id: currentUser.id, type, name,
            last_used: new Date().toISOString(),
          }, { onConflict:"user_id,type,name" });
        } catch(eqErr) { console.warn("Equipment save skipped:",eqErr?.message); }
      }
    } catch(err) {
      console.error("Failed to save entry:", err);
    }
  };

  // ── Sign out ──────────────────────────────────────────────────────────
  const handleSignOut = async ()=>{
    await supabase.auth.signOut();
    setCurrentUser(null);
    setEntries(SAMPLE_ENTRIES);
    setScreen("login");
  };

  const myEntries=entries.filter(e=>e.userId==="me");
  const publicEntries=publicFeed.length?publicFeed:entries.filter(e=>e.isPublic&&e.userId!=="me");
  const palateProfile=useMemo(()=>buildPalateProfile(myEntries),[myEntries]);

  const applyFilter=list=>{ if(filter==="home")return list.filter(e=>e.type==="home"); if(filter==="cafe")return list.filter(e=>e.type==="cafe"); return list; };
  const journalList=filter==="top"
    ? [...myEntries].sort((a,b)=>computeOverall(b.scores||{})-computeOverall(a.scores||{}))
    : applyFilter(myEntries).sort((a,b)=>new Date(b.date)-new Date(a.date));

  const TABS=currentUser
    ?[["journal","Journal","in"],["stats","Stats","in"],["rankings","Rankings","out"],["roasters","Roasters","out"]]
    :[["journal","Journal","in"],["rankings","Rankings","out"],["roasters","Roasters","out"]];

  if(screen==="loading") return(
    <><style>{FONTS}{S}</style>
    <div className="app" style={{display:"flex",alignItems:"center",justifyContent:"center",minHeight:"100vh"}}>
      <div style={{textAlign:"center"}}>
        <TileWordmark size="lg"/>
        <div style={{marginTop:20,fontFamily:"'Fraunces',serif",fontSize:13,color:"var(--ink3)",fontStyle:"italic"}}>Loading…</div>
      </div>
    </div></>
  );
  if(screen==="login") return(<><style>{FONTS}{S}</style><div className="app">{!SUPABASE_CONFIGURED&&<div style={{background:"#fef0f0",border:"1.5px solid #f0c0c0",borderRadius:8,padding:"12px 14px",margin:"12px",fontSize:12,color:"#8b2020",fontFamily:"sans-serif",lineHeight:1.5}}>⚠️ <strong>Supabase not configured.</strong> Check that your <code>.env</code> file has VITE_SUPABASE_URL (ending in .supabase.co, no /rest/v1) and VITE_SUPABASE_ANON_KEY, then fully restart the dev server (Ctrl+C, npm run dev).</div>}<Login onLogin={u=>{setCurrentUser(u);setIsPro(u.is_pro||false);setScreen("app");}} onSkip={()=>{setCurrentUser(null);setScreen("app");}}/></div></>);
  if(selEntry) return(<><style>{FONTS}{S}</style><div className="app"><EntryDetail entry={selEntry} onBack={()=>setSelEntry(null)} onEdit={()=>{setEditEntry(selEntry);setSelEntry(null);setShowForm(true);}}/></div></>);
  if(selRecipe) return(<><style>{FONTS}{S}</style><div className="app"><RecipeDetail recipe={selRecipe} onBack={()=>setSelRecipe(null)}/></div></>);
  if(selRoaster) return(<><style>{FONTS}{S}</style><div className="app"><RoasterDetail roaster={selRoaster} palateProfile={palateProfile} onBack={()=>setSelRoaster(null)}/></div></>);
  // Social discovery (profiles + people search) is intentionally disabled for now.
  // The components remain in the codebase, dormant, for a future opt-in release.

  return (
    <>
      <style>{FONTS}{S}</style>
      <div className="app">
        <div className="hdr">
          <div className="hdr-plaque">
            <div className="hdr-top">
              <TileWordmark size="md"/>
              <div className="hdr-r">
                <span className="hdr-count">{myEntries.length} logged</span>
                {currentUser
              ?<div style={{position:"relative",display:"inline-flex",gap:6,alignItems:"center"}}>
                <button onClick={()=>setShowDiag(true)} title="Diagnostics" style={{background:"none",border:"none",fontSize:14,cursor:"pointer",opacity:0.4,padding:2}}>⚙</button>
                <div className="av-btn" title={currentUser.name} onClick={()=>{if(window.confirm("Sign out?")) handleSignOut();}} style={{cursor:"pointer"}}>{currentUser.avatar}</div>
              </div>
              :<button className="sign-btn" onClick={()=>setScreen("login")}>Sign in</button>}
              </div>
            </div>
            <div className="nav">{TABS.map(([id,label,kind],i)=>{
              const prev=TABS[i-1];
              const showDivider=prev&&prev[2]!==kind;
              return (
                <React.Fragment key={id}>
                  {showDivider&&<div className="nav-divider"/>}
                  <button className={`ntab ${tab===id?"active":""}`} onClick={()=>setTab(id)}>{label}</button>
                </React.Fragment>
              );
            })}</div>
          </div>
          <div className="tile-border"/>
        </div>

        <div className="content">
          {tab==="journal"&&<>
                        <div className="screen-eyebrow inward">Yours</div>
                        <div className="filter-row">{[["all","All"],["home","Home"],["cafe","Café"],["top","Top Rated"]].map(([id,label])=><button key={id} className={`fchip ${filter===id?"active":""}`} onClick={()=>setFilter(id)}>{label}</button>)}</div>
            {journalList.length===0?<div className="empty">
                <div style={{fontSize:52,marginBottom:16,opacity:0.6}}>☕</div>
                <div className="empty-t">"Your journal is empty"</div>
                <div className="empty-s" style={{marginBottom:20}}>"Every great coffee deserves to be remembered. Tap below to log your first."</div>
                {<button onClick={()=>setShowForm(true)} style={{background:"var(--rose)",color:"#fff",border:"none",borderRadius:10,padding:"12px 24px",fontFamily:"'Fraunces',serif",fontSize:16,cursor:"pointer",textShadow:"none",boxShadow:"0 4px 14px rgba(201,123,132,0.4)"}}>Log your first coffee</button>}
              </div>
            :journalList.map(entry=>{
              const drink=drinkInfo(entry.drinkType);
              const user=SAMPLE_USERS.find(u=>u.id===entry.userId);
              const groups=groupNotes(entry.tastingNotes||[]);
              return (
                <div key={entry.id} className="ecard" onClick={()=>setSelEntry(entry)}>
                  {entry.photo&&<img src={entry.photo} className="photo-hero" alt="" style={{height:160,borderRadius:0,marginBottom:0}}/>}
                  <div className="ecard-inner">
                  <div className="ecard-top">
                      <div className="ecard-left">
                        <div className="ecard-meta">
                          <span className={`badge ${entry.type==="cafe"?"badge-cafe":"badge-home"}`}>{entry.type==="cafe"?"Café":"Home"}</span>
                          {drink&&<span style={{fontSize:14}}>{drink.icon}</span>}
                        </div>
                        <div className="ecard-name">{entry.name||drinkLabel(entry)||"Coffee"}</div>
                        <div className="ecard-sub">{entry.roaster}{entry.origin&&` · ${entry.origin}`}{entry.type==="cafe"&&entry.cafeName&&` · ${entry.cafeName}`}</div>
                        
                      </div>
                      <div className="ecard-r">
                        {entry.scores?<ScoreDisplay scores={entry.scores} size="sm"/>:<span style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:"var(--ink3)"}}>–/10</span>}
                        <div className="ecard-date">{fmtDate(entry.date)}</div>
                      </div>
                    </div>
                  </div>
                  {entry.tastingNotes?.length>0&&<><div className="card-sep"/><div className="card-notes-row">{Object.entries(groups).flatMap(([fam,ns])=>{const def=NOTE_FAMILIES[fam]||{color:"#888",bg:"#f5f5f5",border:"#ddd"};return ns.slice(0,2).map(n=><span key={n} className="npill" style={{background:def.bg,color:def.color,border:`1px solid ${def.border}`}}>{n}</span>);})}</div></>}
                  {entry.notes&&<div className="card-quote">"{entry.notes.substring(0,120)}{entry.notes.length>120?"…":""}"</div>}
                </div>
              );
            })}
          </>}
          {tab==="rankings"&&<div className="community-wrap"><RankingsView currentUser={currentUser}/></div>}
          {tab==="roasters"&&(isPro||!currentUser
            ?<RoastersView palateProfile={palateProfile} onSelectRoaster={setSelRoaster}/>
            :<PaywallGate feature="Roaster Matching" reason="See which roasters match your palate profile and get personalised recommendations." onUpgrade={()=>setShowPaywall(true)}/>
          )}
          {tab==="recipes"&&<><div className="section-hdr"><div className="section-title">Brew Recipes</div></div><div className="rec-grid">{RECIPES.map(r=><div key={r.id} className="rec-card" onClick={()=>setSelRecipe(r)}><span className="rec-icon">{r.icon}</span><div className="rec-name">{r.name}</div><div className="rec-meta">{r.ratio} · {r.time}</div><div className="rec-diff">{r.difficulty}</div></div>)}</div></>}
          {tab==="stats"&&<StatsView entries={myEntries} currentUser={currentUser} isPro={isPro} onUpgrade={()=>setShowPaywall(true)}/>}
        </div>

        {tab==="journal"&&<button className="fab" onClick={()=>setShowForm(true)}>+ Log a Coffee</button>}
        {showDiag&&<DiagnosticPanel currentUser={currentUser} onClose={()=>setShowDiag(false)}/>}
        {showPaywall&&<PaywallModal onClose={()=>setShowPaywall(false)} onUpgrade={async()=>{
          setIsPro(true);setShowPaywall(false);
          if(currentUser?.id){
            await supabase.from("users").update({is_pro:true}).eq("id",currentUser.id).catch(e=>console.warn("Pro update failed:",e.message));
          }
        }}/>}
        {showForm&&<LogForm onSave={saveEntry} onClose={()=>{setShowForm(false);setEditEntry(null);}} currentUser={currentUser} editEntry={editEntry}/>}
      </div>
    </>
  );
}
