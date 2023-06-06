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
        
        c.execute('''
                CREATE TABLE IF NOT EXISTS race
                ([race_uuid] BLOB PRIMARY KEY,
                [race_date] TEXT,
                [race_name] TEXT,
                [paceset_one] BLOB,
                [paceset_two] BLOB
                )
                ''')
        
        c.execute('''
                CREATE TABLE IF NOT EXISTS result
                ([result_uuid] BLOB PRIMARY KEY,
                [local_athlete_uuid] BLOB,
                [athlete_uuid] BLOB,
                [result] TEXT,
                [course] TEXT
                )
                ''')
                            
        conn.commit()
        conn.close()
    
    def add_participant(bib, last, first, dob, gender, zip, discipline, disability, season_pass, liability, liability_signed):
        conn = sqlite3.connect("ski_racing_database.db") 
        c = conn.cursor()
        global_uuid = uuid.uuid4().bytes
        local_uuid = uuid.uuid4().bytes
        
        c.execute("INSERT INTO athletes (athlete_uuid, local_athlete_uuid, universal_bib, last_name, first_name, dob, gender, zip, discipline, disability) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",(global_uuid, local_uuid, bib, last, first, dob, gender, zip, discipline, disability))

        c.execute("INSERT INTO local_athletes (local_athlete_uuid, season_pass, liability, liability_signed) VALUES (?,?,?,?)",(local_uuid, season_pass, liability, liability_signed))

        conn.commit()
        conn.close()
    
    def search_participant(bib):
        conn = sqlite3.connect("ski_racing_database.db") 
        c = conn.cursor()     
        res = c.execute('''SELECT universal_bib, 
        first_name || ' ' || last_name,
        discipline
        FROM athletes
        WHERE universal_bib = ?''',bib)
        result = res.fetchone()
        conn.commit()
        conn.close()
        if(result == None):
            return None
        else:
            return result

        
    
    # def edit_participant(bib):
    #     conn = sqlite3.connect("ski_racing_database.db") 
    #     c = conn.cursor()
        
    #     c.execute("SELECT (global_uuid, local_uuid, last, first, dob, gender, zip, discipline, disability) FROM athletes WHERE ")

    #     c.execute("INSERT INTO local_athletes (local_athlete_uuid, season_pass, liability, liability_signed) VALUES (?,?,?,?)",(local_uuid, season_pass, liability, liability_signed))

    #     conn.commit()
    #     conn.close()
    