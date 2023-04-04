from tkinter import *
import tkinter as tk

class MyApp:
    def __init__(self, root):
        root.title("GenTech Apps - Ski Racing")
        root.geometry("500x400")
        root.minsize(500, 400)
        root.maxsize(1500, 900)

        frame = Frame(root, borderwidth=2,relief="flat")
        frame.grid(column=1, row=1, sticky=(N, E, S, W))
        root.columnconfigure(1, weight=1)
        root.rowconfigure(1, weight=1)
        
        frameregister = Frame(frame, borderwidth=2, relief="solid")
        
        # Registration info
        ## Bib
        bib_label = Label(frameregister, text="Bib")
        bib_label.grid(column=1, row=1)

        bib_entry_value = StringVar()
        bib_entry = Entry(frameregister, textvariable=bib_entry_value)
        bib_entry.grid(column=2, row=1)

        ## Last Name
        last_label = Label(frameregister, text="Last Name")
        last_label.grid(column=1, row=2)

        last_entry_value = StringVar()
        last_entry = Entry(frameregister, textvariable=last_entry_value)
        last_entry.grid(column=2, row=2)

        ## First Name
        first_label = Label(frameregister, text="First Name")
        first_label.grid(column=1, row=3)

        first_entry_value = StringVar()
        first_entry = Entry(frameregister, textvariable=first_entry_value)
        first_entry.grid(column=2, row=3)

        ## Gender
        gender_label = Label(frameregister, text="Gender")
        gender_label.grid(column=1, row=4)

        gender = [
            "Male",
            "Female"
        ]

        ### datatype of menu text
        gender_entry = StringVar()
  
        ### initial menu text
        gender_entry.set("Male")
  
        ### Create Dropdown menu
        drop = OptionMenu( root , gender_entry , *gender )
        drop.grid(column=2, row=4)

        ## Zip
        zip_label = Label(frameregister, text="Zipcode")
        zip_label.grid(column=1, row=5)

        zip_entry_value = StringVar()
        zip_entry = Entry(frameregister, textvariable=zip_entry_value)
        zip_entry.grid(column=2, row=5)

        ## Discipline
        discipline_label = Label(frameregister, text="Discipline")
        discipline_label.grid(column=1, row=6)

        discipline = [
            "Alpine",
            "Snowboard",
            "Telemark",
            "Monoski"
        ]

        ### datatype of menu text
        discipline_entry = StringVar()
  
        ### initial menu text
        discipline_entry.set("Alpine")
  
        ### Create Dropdown menu
        drop = OptionMenu( root , discipline_entry , *discipline )
        drop.grid(column=2, row=6)

        ## Disability
        disability_label = Label(frameregister, text="Discipline")
        disability_label.grid(column=1, row=7)

        disability = [
            "None",
            "Blind",
            "Paralysis",
            "Mental"
        ]

        ### datatype of menu text
        disability_entry = StringVar()
  
        ### initial menu text
        disability_entry.set("Alpine")
  
        ### Create Dropdown menu
        drop = OptionMenu( root , disability_entry , *disability )
        drop.grid(column=2, row=7)





root = Tk()
MyApp(root)
root.mainloop()