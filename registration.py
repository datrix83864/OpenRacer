from tkinter import *
import tkinter as tk
from tkcalendar import DateEntry

class Competitor:
    def __init__(self, bib, last, first, dob, gender, zip, discipline, disability, season_pass, liability, liability_date):
        self.bib = bib
        self.last = last
        self.first = first
        self.dob = dob
        self.gender = gender
        self.zip = zip
        self.discipline = discipline
        self.disability = disability
        self.season_pass = season_pass
        self.liability = liability
        self.liability_date = liability_date

class Registration(tk.Toplevel):
    alive = False
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.title("GenTech Apps - Ski Racing")
        self.geometry("300x400")
        self.minsize(300, 400)
        self.maxsize(1500, 900)
        self.__class__.alive=True

        frame = Frame(self, borderwidth=2,relief="flat")
        frame.grid(column=1, row=1, sticky=(N, E, S, W))
        self.columnconfigure(1, weight=1)
        self.rowconfigure(1, weight=1)
        
        frameregister = Frame(frame, borderwidth=2, relief="solid")
        frameregister.grid(column=1, row=1, sticky=(N, E, S, W))
        
        # Registration info
        ## Bib
        bib_label = Label(frameregister, text="Bib")
        bib_label.grid(column=1, row=1)

        self.bib_entry_value = StringVar()
        self.bib_entry = Entry(frameregister, textvariable=self.bib_entry_value)
        self.bib_entry.grid(column=2, row=1)

        ## Last Name
        last_label = Label(frameregister, text="Last Name")
        last_label.grid(column=1, row=2)

        self.last_entry_value = StringVar()
        self.last_entry = Entry(frameregister, textvariable=self.last_entry_value)
        self.last_entry.grid(column=2, row=2)

        ## First Name
        first_label = Label(frameregister, text="First Name")
        first_label.grid(column=1, row=3)

        self.first_entry_value = StringVar()
        self.first_entry = Entry(frameregister, textvariable=self.first_entry_value)
        self.first_entry.grid(column=2, row=3)

        ## Date of Birth
        dob_label = Label(frameregister, text="Date of Birth")
        dob_label.grid(column=1, row=4)

        self.dob_entry_value = DateEntry(frameregister, locale='en_US', date_pattern="MM/dd/yyyy" )
        self.dob_entry_value.grid(column=2, row=4)

        ## Gender
        gender_label = Label(frameregister, text="Gender")
        gender_label.grid(column=1, row=5)

        gender = [
            "Male",
            "Female"
        ]

        ### datatype of menu text
        self.gender_entry_value = StringVar()
  
        ### initial menu text
        self.gender_entry_value.set("Male")
  
        ### Create Dropdown menu
        drop = OptionMenu( frameregister , self.gender_entry_value , *gender )
        drop.grid(column=2, row=5)

        ## Zip
        zip_label = Label(frameregister, text="Zipcode")
        zip_label.grid(column=1, row=6)

        self.zip_entry_value = StringVar()
        self.zip_entry = Entry(frameregister, textvariable=self.zip_entry_value)
        self.zip_entry.grid(column=2, row=6)

        ## Discipline
        discipline_label = Label(frameregister, text="Discipline")
        discipline_label.grid(column=1, row=7)

        discipline = [
            "Alpine",
            "Snowboard",
            "Telemark",
            "Monoski"
        ]

        ### datatype of menu text
        self.discipline_entry_value = StringVar()
  
        ### initial menu text
        self.discipline_entry_value.set("Alpine")
  
        ### Create Dropdown menu
        drop = OptionMenu( frameregister , self.discipline_entry_value , *discipline )
        drop.grid(column=2, row=7)

        ## Disability
        disability_label = Label(frameregister, text="Disability")
        disability_label.grid(column=1, row=8)

        disability = [
            "None",
            "Blind",
            "Paralysis",
            "Mental"
        ]

        ### datatype of menu text
        self.disability_entry_value = StringVar()
  
        ### initial menu text
        self.disability_entry_value.set("None")
  
        ### Create Dropdown menu
        drop = OptionMenu( frameregister , self.disability_entry_value , *disability )
        drop.grid(column=2, row=8)

        # Mountain Specific Forms
        frameforms = Frame(frame, borderwidth=2, relief="solid")
        frameforms.grid(column=1, row=2, sticky=(N, E, S, W))

        ## Season Pass
        self.season_pass_entry_value = tk.Checkbutton(frameforms,text="Has season pass", onvalue=1, offvalue=0)
        self.season_pass_entry_value.grid(column=1, row=1, sticky=(N,E,S,W))

        ## Liability Waiver
        self.liability_signed_entry_value = tk.Checkbutton(frameforms,text="Has signed waiver", onvalue=1, offvalue=0)
        self.liability_signed_entry_value.grid(column=1, row=2, sticky=(N,E,S,W))
        last_signed_label = Label(frameforms, text="Last Signed")
        last_signed_label.grid(column=1, row=3)

        self.last_signed_entry_value = DateEntry(frameforms, locale='en_US', date_pattern="MM/dd/yyyy")
        self.last_signed_entry_value.grid(column=2, row=3)

        # Button
        framebutton = Frame(frame, borderwidth=2, relief="solid")
        framebutton.grid(column=1, row=2, sticky=(N, E, S, W))
        ## Save & New Entry
        save_new_button = Button(framebutton, text="Save & New", command=self.save_new)
        save_new_button.grid(column=1, row=1, sticky=(E))

        ## Save & Close Entry
        save_close_button = Button(framebutton, text="Save & Close", command=self.save_close)
        save_close_button.grid(column=2, row=1, sticky=(E))

        ## Clear Entry
        clear_button = Button(framebutton, text="Clear", command=self.clear_text)
        clear_button.grid(column=3, row=1, sticky=(E))

    def clear_text(self):
        self.bib_entry.delete(0, END) 
        self.last_entry.delete(0, END)
        self.first_entry.delete(0, END) 
        self.zip_entry.delete(0, END) 
    
    def save_close(self):
        self.destroy()

    def save_new(self):
        self.destroy()

    def destroy(self):
        # Restore the attribute on close.
        self.__class__.alive = False
        return super().destroy()