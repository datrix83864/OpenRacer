from tkinter import *
from tkinter import ttk
import sqlite3
import pandas as pd
import uuid

class Database():
    def __init__(self):
        conn = sqlite3.connect('ski_racing_database.db') 
        c = conn.cursor()

        c.execute('''
                CREATE TABLE IF NOT EXISTS athletes
                ([athlete_uuid] BLOB PRIMARY KEY, 
                [local_athlete_uuid] BLOB,
                [universal_bib] TEXT, 
                [last_name] TEXT, 
                [first_name] TEXT,
                [dob] INTEGER,
                [gender] TEXT,
                [zip] TEXT,
                [discipline] TEXT,
                [disability] TEXT)
                ''')

        c.execute('''
                CREATE TABLE IF NOT EXISTS local_athletes
                ([athlete_uuid] BLOB,
                [local_athlete_uuid] BLOB PRIMARY KEY,
                [universal_bib] TEXT,
                [season_pass] INTEGER,
                [liability] INTEGER,
                [liability_signed] INTEGER)
                ''')
                            
        conn.commit()
        conn.close()
    
    def add_participant(bib, last, first, dob, gender, zip, discipline, disability, season_pass, liability, liability_signed):
        conn = sqlite3.connect("ski_racing_database.db") 
        c = conn.cursor()
        global_uuid = uuid.uuid4().bytes
        local_uuid = uuid.uuid4().bytes
        
        c.execute("INSERT INTO athletes (athlete_uuid, local_athlete_uuid, last_name, first_name, dob, gender, zip, discipline, disability) VALUES (?,?, ?, ?, ?, ?, ?, ?, ?)",(global_uuid, local_uuid, last, first, dob, gender, zip, discipline, disability))

        c.execute("INSERT INTO local_athletes (local_athlete_uuid, season_pass, liability, liability_signed) VALUES (?,?,?,?)",(local_uuid, season_pass, liability, liability_signed))

        conn.commit()
        conn.close()
    
    