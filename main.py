
from tkinter import *
from tkinter import ttk
import tkinter as tk
from registration import *
from database import Database
from timing import Timing
import sqlite3
root = Tk()
Database()

def edit():
    selected_item = tree.selection()[0]
    tree.item(selected_item)

def competitor():
    for row in tree.get_children():
        tree.delete(row)
    conn = sqlite3.connect("ski_racing_database.db")
    
    cur = conn.cursor()
    cur.execute("SELECT universal_bib, first_name, last_name from athletes")
    rows = cur.fetchall()
    for row in rows:
        tree.insert("", tk.END, values=row)
    conn.close()

def open_registration_window():
    if not Registration.alive:
        registration_window = Registration()
    else:
        registration_window.focus_set()

def open_timing_window():
    if not Timing.alive:
        timing_window = Timing()
    else:
        timing_window.focus_set()

root.geometry("700x400")
root.minsize(400, 300)
root.maxsize(800, 600)
root.title("GenTech Apps - Ski Racing")
frame = Frame(root, borderwidth=2,relief="flat")
frame.grid(column=5, row=2, sticky=(N, E, S, W))

button_register = ttk.Button(
    frame,
    text="Registration",
    command=open_registration_window
)
button_register.grid(column=1, row=1)

button_timing = ttk.Button(
    frame,
    text="Timing",
    command=open_timing_window
)

button_timing.grid(column=2, row=1)

tree = ttk.Treeview(frame, column=("c1", "c2", "c3"), show='headings')

tree.column("#1", anchor=tk.W)

tree.heading("#1", text="ID")

tree.column("#2", anchor=tk.W)

tree.heading("#2", text="First Name")

tree.column("#3", anchor=tk.W)

tree.heading("#3", text="Last Name")

tree.grid(column = 1, row = 2, columnspan=4)
competitor()

button1 = tk.Button(text="Display data", command=competitor)
button1.grid(column=1, row=4)

edit_btn = tk.Button(text="Edit", command=edit)
edit_btn.grid(column=2, row=4)

# main_window = MainWindow()
# main_window.mainloop()
root.mainloop()