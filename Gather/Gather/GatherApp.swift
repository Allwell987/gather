//
//  GatherApp.swift
//  Gather
//
//  Created by Allwell on 7/27/26.
//

import SwiftUI
import CoreData

@main
struct GatherApp: App {
    let persistenceController = PersistenceController.shared

    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.managedObjectContext, persistenceController.container.viewContext)
        }
    }
}
