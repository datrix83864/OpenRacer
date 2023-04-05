import tkinter as tk
from tkinter import ttk
from registration import *
from database import Database
import sqlite3
root = Tk()
class MainWindow:
    
    def show_participants(self):
        conn = sqlite3.connect("ski_racing_database.db")
        cur = conn.cursor()
        cur.execute("SELECT last_name, first_name, dob from athletes")
        
        rows = cur.fetchall()
        for row in rows:
            print(row)
            tree.insert("", tk.END, values=row)
        conn.close()

    def __init__(self,root):        
        root.geometry("500x400")
        root.minsize(400, 300)
        root.maxsize(800, 600)
        root.title("GenTech Apps - Ski Racing")
        frame = Frame(root, borderwidth=2,relief="flat")
        frame.grid(column=1, row=1, sticky=(N, E, S, W))
        
        self.button_open = ttk.Button(
            frame,
            text="Registration",
            command=self.open_registration_window
        )
        self.button_open.grid(column=1, row=1)
        tree = ttk.Treeview(frame, column=("c1", "c2", "c3"), show='headings')

        tree.column("#1", anchor=tk.CENTER)

        tree.heading("#1", text="ID")

        tree.column("#2", anchor=tk.CENTER)

        tree.heading("#2", text="FNAME")

        tree.column("#3", anchor=tk.CENTER)

        tree.heading("#3", text="LNAME")

        tree.grid(column = 1, row = 2)
        conn = sqlite3.connect("ski_racing_database.db")
        cur = conn.cursor()
        cur.execute("SELECT last_name, first_name, dob from athletes")
        
        rows = cur.fetchall()
        for row in rows:
            print(row)
            tree.insert("", tk.END, values=row)
        conn.close()
        button1 = tk.Button(text="Display data", command=self.show_participants)

        button1.grid(column=1, row=3)
                
    def open_registration_window(self):
        if not Registration.alive:
            self.registration_window = Registration()
        else:
            self.registration_window.focus_set()
            


Database()
MainWindow(root)
# main_window = MainWindow()
# main_window.mainloop()
root.mainloop()