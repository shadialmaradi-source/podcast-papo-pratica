-- Update absolute_beginner (taxi ride)
UPDATE public.onboarding_videos SET 
exercises = '[
  {"question":"What does the passenger ask the driver?","options":["Can you take me to the airport?","Can you take me to the hotel?","Can you take me home?","Can you take me to the station?"],"correctAnswer":"Can you take me to the airport?","type":"multiple_choice"},
  {"question":"How many suitcases does the passenger have?","options":["One","Two","Three","None"],"correctAnswer":"One","type":"multiple_choice"},
  {"question":"How long will the trip take?","options":["About 10 minutes","About 20 minutes","About 30 minutes","About 45 minutes"],"correctAnswer":"About 30 minutes","type":"multiple_choice"},
  {"question":"How much will the ride cost?","options":["Around $15","Around $20","Around $25","Around $30"],"correctAnswer":"Around $25","type":"multiple_choice"},
  {"question":"True or false: The driver asks the passenger to fasten the seat belt.","options":["True","False"],"correctAnswer":"True","type":"multiple_choice"}
]'::jsonb,
speaking_phrases = '[
  {"phrase":"Can you take me to the airport?","translation":"Requesting a destination from a taxi driver","phonetic":"kan yoo teyk mee too thee air-port"},
  {"phrase":"How long will it take?","translation":"Asking about travel duration","phonetic":"how lawng wil it teyk"},
  {"phrase":"Please fasten your seat belt.","translation":"A safety instruction","phonetic":"pleez fas-en yor seet belt"}
]'::jsonb,
flashcards = '[
  {"phrase":"luggage","translation":"Bags and suitcases you travel with","why":"Essential travel vocabulary"},
  {"phrase":"trunk","translation":"The back storage area of a car","why":"Used when putting bags in a taxi or car"},
  {"phrase":"highway","translation":"A fast, main road between cities","why":"Common word when discussing routes"},
  {"phrase":"traffic","translation":"Cars and vehicles on the road causing delays","why":"Important for understanding travel times"},
  {"phrase":"fasten","translation":"To close or secure something tightly","why":"Used with seat belts and safety equipment"}
]'::jsonb
WHERE id = '23c5c020-82bf-4641-a103-45a8e39bb153';

-- Update beginner (police report / lost ID)
UPDATE public.onboarding_videos SET 
exercises = '[
  {"question":"What does the person want to do at the police station?","options":["Report something","Ask for directions","Pay a fine","Get a license"],"correctAnswer":"Report something","type":"multiple_choice"},
  {"question":"What did the person lose?","options":["Their wallet","Their ID","Their phone","Their keys"],"correctAnswer":"Their ID","type":"multiple_choice"},
  {"question":"Does the person have a copy of their passport?","options":["Yes","No"],"correctAnswer":"No","type":"multiple_choice"},
  {"question":"What is the person''s name?","options":["Katalina Gomez","Katalina Golans","Katarina Goland","Katalina Garcia"],"correctAnswer":"Katalina Golans","type":"multiple_choice"},
  {"question":"True or false: The officer says the photo looks like the person.","options":["True","False"],"correctAnswer":"False","type":"multiple_choice"}
]'::jsonb,
speaking_phrases = '[
  {"phrase":"I want to report something.","translation":"Telling the police you need to file a report","phonetic":"ai wont too ree-port sum-thing"},
  {"phrase":"I lost my ID.","translation":"Explaining you have lost your identification","phonetic":"ai lawst mai ai-dee"},
  {"phrase":"Do you have a copy?","translation":"Asking if someone has a duplicate document","phonetic":"doo yoo hav uh kop-ee"}
]'::jsonb,
flashcards = '[
  {"phrase":"report","translation":"To officially tell someone about a problem or event","why":"Used when filing complaints or informing authorities"},
  {"phrase":"document","translation":"An official paper with important information","why":"Essential for talking about IDs, passports, etc."},
  {"phrase":"passport","translation":"An official document for international travel","why":"Key vocabulary for travel and identification"},
  {"phrase":"ID number","translation":"A unique number on your identification card","why":"Needed when dealing with official processes"},
  {"phrase":"copy","translation":"A duplicate of an original document","why":"Often needed for official paperwork"}
]'::jsonb
WHERE id = 'e4890558-c59b-467f-8d54-0e9bffef16a8';

-- Update intermediate (fire truck story)
UPDATE public.onboarding_videos SET 
exercises = '[
  {"question":"What did the little fire truck love doing?","options":["Racing other trucks","Helping people","Playing by the river","Going to the store"],"correctAnswer":"Helping people","type":"multiple_choice"},
  {"question":"Where were the kids playing?","options":["In the park","By the river","At school","In the street"],"correctAnswer":"By the river","type":"multiple_choice"},
  {"question":"Why couldn''t the fire truck join the kids?","options":["He was too big","He was too busy","He was too tired","He was broken"],"correctAnswer":"He was too busy","type":"multiple_choice"},
  {"question":"What happened to Lily?","options":["She got lost","She fell down and scraped her knee","She lost her toy","She was scared"],"correctAnswer":"She fell down and scraped her knee","type":"multiple_choice"},
  {"question":"How did the fire truck help Lily?","options":["He called an ambulance","He cleaned her wound with his water hose","He carried her home","He gave her a bandage"],"correctAnswer":"He cleaned her wound with his water hose","type":"multiple_choice"}
]'::jsonb,
speaking_phrases = '[
  {"phrase":"He loved helping people.","translation":"Describing someone who enjoys assisting others","phonetic":"hee luvd help-ing pee-pul"},
  {"phrase":"She had fallen down and scraped her knee.","translation":"Describing a minor injury from a fall","phonetic":"shee had faw-len down and skraypt her nee"},
  {"phrase":"Thank you for helping me.","translation":"Expressing gratitude for assistance","phonetic":"thank yoo for help-ing mee"}
]'::jsonb,
flashcards = '[
  {"phrase":"grocery store","translation":"A shop where you buy food and supplies","why":"Everyday vocabulary for shopping"},
  {"phrase":"supplies","translation":"Things you need for a task or daily life","why":"Useful word for talking about what you need to buy"},
  {"phrase":"wound","translation":"An injury where the skin is broken","why":"Important for describing injuries"},
  {"phrase":"hose","translation":"A flexible tube for carrying water","why":"Found in gardens and on fire trucks"},
  {"phrase":"scraped","translation":"Rubbed skin against a rough surface causing injury","why":"Common word for minor injuries from falls"}
]'::jsonb
WHERE id = '872a38b8-eef5-4ecd-935e-ed90eba85b8a';

-- Update advanced (Banksy mural)
UPDATE public.onboarding_videos SET 
exercises = '[
  {"question":"What did the journalist first think had happened to his garden wall?","options":["It had been decorated by an artist","It had been spray painted by vandals","It had been knocked down","It had been covered with posters"],"correctAnswer":"It had been spray painted by vandals","type":"multiple_choice"},
  {"question":"What did someone tell the journalist to do?","options":["Call the police","Take a few steps back","Clean the wall","Take a photo"],"correctAnswer":"Take a few steps back","type":"multiple_choice"},
  {"question":"Who confirmed the artwork was genuine?","options":["The local council","A gallery owner","Banksy","The BBC"],"correctAnswer":"Banksy","type":"multiple_choice"},
  {"question":"Why does the journalist say the experience makes him feel like he belongs?","options":["Because he is famous now","Because people treat him like a celebrity","Because as an immigrant, community connection matters to him","Because he sold the wall"],"correctAnswer":"Because as an immigrant, community connection matters to him","type":"multiple_choice"},
  {"question":"What did the local authorities do after the mural was defaced?","options":["Removed it","Put up barriers","Painted over it","Ignored it"],"correctAnswer":"Put up barriers","type":"multiple_choice"}
]'::jsonb,
speaking_phrases = '[
  {"phrase":"I realised I was in front of a masterpiece of art.","translation":"Expressing a sudden understanding of something impressive","phonetic":"ai ree-uh-lized ai wuz in frunt ov uh mas-ter-pees ov art"},
  {"phrase":"This kind of thing makes me feel like I really belong.","translation":"Expressing a sense of community connection","phonetic":"this kind ov thing mayks mee feel like ai ree-lee bee-long"},
  {"phrase":"The local authorities have put up barriers.","translation":"Describing official protective measures","phonetic":"thuh loh-kul aw-thor-ih-teez hav put up bar-ee-erz"}
]'::jsonb,
flashcards = '[
  {"phrase":"vandals","translation":"People who deliberately damage property","why":"Used to describe people who destroy or deface things"},
  {"phrase":"masterpiece","translation":"An outstanding work of art or skill","why":"Used to describe exceptional creative works"},
  {"phrase":"mural","translation":"A large painting done directly on a wall","why":"Key word for street art and public artwork"},
  {"phrase":"defaced","translation":"Spoiled or damaged the appearance of something","why":"Often used when artwork or property is damaged"},
  {"phrase":"barriers","translation":"Fences or obstacles to block access","why":"Used by authorities to protect or restrict areas"}
]'::jsonb
WHERE id = 'abf586d5-f0ee-401a-8f8d-04d6b698a0f3';