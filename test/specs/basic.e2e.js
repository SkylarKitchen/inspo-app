const { expect } = require('@wdio/globals')
const fs = require('fs')
const path = require('path')

describe('Inspo App Basic Tests', () => {
    it('should launch the application and show main window', async () => {
        // Wait for window to load
        await $('body').waitForExist({ timeout: 10000 });

        // Check title
        // Note: Tauri apps might not have a document.title depending on config
        const bodyClass = await $('body').getAttribute('class');
        expect(bodyClass).toBeDefined();
    })

    it('should display the Library section in sidebar', async () => {
        const sidebar = await $('.section-header=Library');
        await expect(sidebar).toBeExisting();
    })

    it('should allow navigation to Favorites', async () => {
        const favoritesBtn = await $('button*=Favorites');
        await favoritesBtn.click();

        // Check active state class
        const classNames = await favoritesBtn.getAttribute('class');
        expect(classNames).toContain('bg-primary-subtle');
        expect(classNames).toContain('text-primary');
    })

    it('should show DropZone', async () => {
        const dropZone = await $('div.relative.flex-1.flex.flex-col');
        await expect(dropZone).toBeExisting();
    })
})
